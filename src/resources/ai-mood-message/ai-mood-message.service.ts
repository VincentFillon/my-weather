import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GeminiModel,
  GeminiModelDocument,
} from 'src/resources/ai-mood-message/entities/gemini-model.entity';
import {
  DEFAULT_GEMINI_MODEL_NAME,
  DEFAULT_GEMINI_SYSTEM_INSTRUCTION,
} from 'src/resources/ai-mood-message/utils/constants';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { MoodService } from 'src/resources/mood/mood.service';
import { UserHistoryDocument } from 'src/resources/user-history/entities/user-history.entity';
import { UserHistoryService } from 'src/resources/user-history/user-history.service';

interface AiMoodPeriod {
  mood: Mood | null;
  from: Date; // Date de sélection de l'humeur
  duration: number; // Durée en millisecondes
}

interface MoodAnalysis {
  dominantMood: string | null; // Humeur dominante sur la période
  firstPickToday: boolean; // Indique si c'est le premier choix d'humeur de la journée
  firstPickWeek: boolean; // Indique si c'est le premier choix d'humeur de la semaine
  currentStreak: number; // Longueur de la série actuelle dans la même humeur
  roundTripStreak: number; // Longueur de la série d'aller-retour entre deux humeurs
  previousMood: string | null; // Humeur dominante sur la période
  previousMoodDuration: number; // Durée de la dernière humeur en minutes
  unusualChange: boolean; // Indique si le changement d'humeur est inhabituel
}

@Injectable()
export class AiMoodMessageService {
  private logger: Logger = new Logger(AiMoodMessageService.name);
  private lastRequestTime: Map<string, number> = new Map(); // Pour la limitation d'usage
  private readonly COOLDOWN_MS = 30 * 1000; // 30 secondes de cooldown

  private readonly AI_MOOD_BOT_NAME = 'AI Mood Bot';

  private ai: GoogleGenAI;

  private model: string;
  private systemInstruction: string;
  private lastConfigLoadTime: number = 0; // Timestamp de la dernière fois que la config a été chargée
  private readonly CONFIG_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(GeminiModel.name)
    private geminiModel: Model<GeminiModelDocument>,
    private readonly moodService: MoodService,
    private readonly userHistoryService: UserHistoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async init() {
    await this.loadGeminiConfig();
  }

  private async loadGeminiConfig(): Promise<void> {
    const now = Date.now();
    if (
      this.ai &&
      this.lastConfigLoadTime &&
      now - this.lastConfigLoadTime < this.CONFIG_REFRESH_INTERVAL_MS
    ) {
      // Ne pas recharger si le dernier chargement est trop récent
      return;
    }

    this.logger.log('[AI Mood] Rechargement de la configuration Gemini...');
    const models = await this.geminiModel.find();
    if (!models || models.length === 0) {
      this.logger.error(
        'Aucun modèle Gemini trouvé. Le bot AI Mood ne fonctionnera pas.',
      );
      this.ai = null; // S'assurer que l'IA est désactivée si aucune config n'est trouvée
      return;
    }

    this.ai = new GoogleGenAI({
      apiKey: models[0]?.apiKey,
    });
    this.model = models[0]?.modelName || DEFAULT_GEMINI_MODEL_NAME;
    this.systemInstruction =
      models[0]?.systemInstruction || DEFAULT_GEMINI_SYSTEM_INSTRUCTION;

    // Lister les humeurs existantes dans les instructions système
    const moods = await this.moodService.findAll();
    if (moods && moods.length > 0) {
      const moodList = moods
        .sort((a, b) => a.order - b.order)
        .map((m) => `${m.order}. « ${m.name} »`)
        .join('\n');
      this.systemInstruction += `\n\n# Liste des humeurs disponibles : \n${moodList}.`;
    }

    this.lastConfigLoadTime = now;
    this.logger.log('[AI Mood] Configuration Gemini rechargée avec succès.');
    this.logger.log(`[AI Mood] Model : '${this.model}'`);
    this.logger.log(`[AI Mood] Instructions : \n${this.systemInstruction}`);
  }

  @OnEvent('user.history.updated')
  async handleMoodUpdated(payload: UserHistoryDocument): Promise<void> {
    const userId = payload.user._id.toString();
    const mood = payload.mood;

    // 1. Vérifier la limitation d'usage
    if (this.isRateLimited(userId)) {
      this.logger.warn(
        `[AI Mood] User ${userId} is rate-limited. Skipping AI message.`,
      );
      return;
    }

    // 2. Récupérer les humeurs disponibles et l'historique des humeurs de l'utilisateur
    const moods = await this.moodService.findAll();
    const historyFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Historique des 7 derniers jours
    const userHistory = await this.userHistoryService.findByFilters({
      userId,
      from: historyFrom,
    });
    // Filtrer les humeurs nulles et s'assurer que ce sont des MoodDocument
    const moodHistory = this.summarizeHistory(userId, userHistory.data);

    // 3. Construire le prompt pour l'IA
    const prompt = this.buildAiPrompt(moods, mood, moodHistory);

    // 4. Appeler l'API d'IA (Placeholder)
    const aiMessageContent = await this.generateAiMessage(prompt);

    // 5. Envoyer le message au chat
    if (aiMessageContent) {
      this.eventEmitter.emit('chat.bot.message', {
        to: userId,
        content: aiMessageContent,
        botName: this.AI_MOOD_BOT_NAME,
      });
      this.updateLastRequestTime(userId);
      this.logger.log(
        `[AI Mood] Sent AI message for user ${userId}: "${aiMessageContent}"`,
      );
    }
  }

  private isRateLimited(userId: string): boolean {
    const lastTime = this.lastRequestTime.get(userId);
    if (lastTime && Date.now() - lastTime < this.COOLDOWN_MS) {
      return true;
    }
    return false;
  }

  private updateLastRequestTime(userId: string): void {
    this.lastRequestTime.set(userId, Date.now());
  }

  private summarizeHistory(
    userId: string,
    history: UserHistoryDocument[],
  ): AiMoodPeriod[] {
    const moodPeriods: AiMoodPeriod[] = [];
    if (!history || history.length === 0) return moodPeriods;

    // Trier l'historique par date de création
    history.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Ne pas traiter le dernier élément (c'est l'humeur actuelle)
    for (let i = 0; i < history.length - 1; i++) {
      const entry = history[i];
      // Ne pas prendre en compte les changements automatiques d'humeur ou celles effectuées par un administrateur
      if (entry.updatedBy?._id.toString() === userId) {
        moodPeriods.push({
          mood: entry.mood,
          from: entry.createdAt,
          duration:
            i < history.length - 1
              ? history[i + 1].createdAt.getTime() - entry.createdAt.getTime()
              : Date.now() - entry.createdAt.getTime(),
        });
      }
    }

    return moodPeriods;
  }

  /**
   * Retourne une analyse sous forme de texte :
   * - humeur dominante
   * - indice moyen
   * - longueur de la série actuelle
   * - « unusual change » si l'écart d'index > 1
   */
  private analyzeTrends(
    allMoods: Mood[],
    history: AiMoodPeriod[],
    currentMood: string,
  ): MoodAnalysis {
    const analysis: MoodAnalysis = {
      dominantMood: null,
      firstPickToday: false,
      firstPickWeek: false,
      currentStreak: 0,
      roundTripStreak: 0,
      previousMood: null,
      previousMoodDuration: 0,
      unusualChange: false,
    };

    // 1) Déterminer l'humeur dominante
    // Créer un mapping label → ordre (index de positivité)
    const moodIndex = new Map<string, number>();
    allMoods.forEach((m, i) => moodIndex.set(m.name, m.order));
    // Filtrer l'historique sur les périodes valides
    const validPeriods = history.filter(
      (p) => p.mood && moodIndex.has(p.mood.name),
    );
    // Totaliser la durée par humeur
    const durations = new Array(allMoods.length).fill(0);
    validPeriods.forEach((p) => {
      const idx = moodIndex.get(p.mood.name);
      durations[idx] += p.duration;
    });
    const dominantIdx = durations
      .map((d, i) => ({ idx: i, d }))
      .reduce((a, b) => (b.d > a.d ? b : a)).idx;
    analysis.dominantMood =
      allMoods.find((m) => m.order === dominantIdx)?.name ?? null;

    // 2) Vérifier si c'est le premier choix de la journée
    const today = new Date();
    const pickedToday = validPeriods.filter((p) => {
      const periodDate = new Date(p.from);
      return (
        periodDate.getDate() === today.getDate() &&
        periodDate.getMonth() === today.getMonth() &&
        periodDate.getFullYear() === today.getFullYear()
      );
    });
    analysis.firstPickToday = pickedToday.length === 0;

    // 3) Vérifier si c'est le premier choix de la semaine
    const nowIsMonday = today.getDay() === 1; // 0 = Sunday, 1 = Monday
    analysis.firstPickWeek = nowIsMonday && analysis.firstPickToday;

    if (validPeriods.length > 0) {
      const previousMood = validPeriods[validPeriods.length - 1];
      // Ne prendre en compte la dernière humeur que si elle a été sélectionnée le même jour
      const pickedDate = new Date(previousMood.from);
      if (
        previousMood.mood.name !== currentMood &&
        pickedDate.getDate() === today.getDate() &&
        pickedDate.getMonth() === today.getMonth() &&
        pickedDate.getFullYear() === today.getFullYear()
      ) {
        // 4) Récupérer la dernière humeur

        analysis.previousMood = previousMood.mood.name;

        // 5) Récupérer la durée de la dernière humeur
        analysis.previousMoodDuration = Math.round(
          ((previousMood.duration ?? 0) / 1000) * 60,
        );
      }
    }

    // 6) Longueur de la série actuelle de la même humeur (streak)
    for (let i = validPeriods.length - 1; i >= 0; i--) {
      if (validPeriods[i].mood.name === currentMood) analysis.currentStreak++;
      else break;
    }

    // 7) Longueur de la série actuelle d'aller-retours entre deux humeurs (roundTripStreak)
    const lastMood =
      validPeriods.length > 0
        ? validPeriods[validPeriods.length - 1].mood.name
        : null;
    if (lastMood) {
      let checkCurrent = true;
      for (let i = validPeriods.length - 2; i >= 0; i--) {
        if (checkCurrent && validPeriods[i].mood.name === currentMood)
          analysis.roundTripStreak++;
        else if (!checkCurrent && validPeriods[i].mood.name === lastMood)
          analysis.roundTripStreak++;
        else break;
        checkCurrent = !checkCurrent;
      }
    }

    // 8) Évaluer si le changement est inhabituel
    analysis.unusualChange =
      analysis.previousMood &&
      moodIndex.has(analysis.previousMood) &&
      Math.abs(
        (moodIndex.get(currentMood) ?? 0) - moodIndex.get(analysis.previousMood),
      ) >=
        allMoods.length / 2;

    return analysis;
  }

  /**
   * Formate l'objet d'analyse en un résumé textuel pour le prompt de l'IA.
   * Ne retourne que les points significatifs pour éviter le bruit.
   * @param analysis L'objet contenant l'analyse comportementale.
   * @returns Une chaîne de caractères formatée ou null s'il n'y a rien à dire.
   */
  private formatAnalysisForPrompt(
    analysis: MoodAnalysis,
    currentMood: string,
  ): string | null {
    const analysisParts: string[] = [];

    // --- On traite les informations par ordre de priorité ---
    if (analysis.previousMood) {
      analysisParts.push(`- Humeur Précédente : « ${analysis.previousMood} »`);

      // On ne mentionne la durée que si elle est particulièrement courte (ex: moins d'une heure)
      // pour souligner la volatilité.
      if (
        analysis.previousMoodDuration > 0 &&
        analysis.previousMoodDuration < 60
      ) {
        analysisParts.push(
          `- L'humeur précédente n'a duré que ${analysis.previousMoodDuration} minutes.`,
        );
      }
    } else if (analysis.firstPickWeek) {
      analysisParts.push(`- C'est sa première humeur de la semaine.`);
    } else if (analysis.firstPickToday) {
      // On utilise "else if" pour ne pas afficher les deux si c'est un lundi.
      analysisParts.push(`- C'est sa première humeur de la journée.`);
    }

    if (analysis.unusualChange) {
      analysisParts.push(
        `- Le changement est très brutal par rapport à l'humeur précédente.`,
      );
    }

    // Une série de 1 n'est pas une série, on ne la mentionne qu'à partir de 2.
    if (analysis.currentStreak > 1) {
      analysisParts.push(
        `- Série en cours : ${analysis.currentStreak} fois de suite la même humeur.`,
      );
    }

    // De même pour les allers-retours.
    if (analysis.roundTripStreak > 1) {
      analysisParts.push(
        `- Il alterne entre les deux mêmes humeurs pour la ${analysis.roundTripStreak}e fois.`,
      );
    }

    const isDominantMoodRelevant =
      analysis.dominantMood &&
      (currentMood === analysis.dominantMood ||
        analysis.previousMood === analysis.dominantMood);

    if (isDominantMoodRelevant) {
      analysisParts.push(
        `- Note pour contexte : sa tendance générale sur les derniers jours est « ${analysis.dominantMood} ».`,
      );
    }

    // S'il n'y a aucune analyse pertinente, on ne retourne rien pour ne pas polluer.
    if (analysisParts.length === 0) {
      return null;
    }

    // On assemble le tout avec un titre de section.
    return analysisParts.join('\n');
  }

  private buildAiPrompt(
    moods: Mood[],
    currentMood: Mood,
    moodHistory: AiMoodPeriod[],
  ): string {
    const analysis = this.analyzeTrends(moods, moodHistory, currentMood.name);

    const formattedAnalysis = this.formatAnalysisForPrompt(analysis, currentMood.name);

    // Créez un prompt beaucoup plus simple et direct.
    // Le modèle a déjà les instructions et les exemples dans le system prompt.
    // Donnez-lui juste le strict nécessaire pour la tâche actuelle.

    const promptParts = [
      `# Contexte pour ta réponse :`,
      `- Humeur Actuelle : « ${currentMood.name} »`,
    ];

    if (formattedAnalysis) {
      promptParts.push(formattedAnalysis);
    }

    // La dernière ligne est l'instruction de ce qu'il doit faire MAINTENANT.
    promptParts.push(`\nGénère la réponse appropriée.`);

    return promptParts.join('\n');
  }

  private async generateAiMessage(prompt: string): Promise<string | null> {
    // Vérifier et recharger la configuration si nécessaire
    await this.loadGeminiConfig();

    if (!this.ai) {
      this.logger.error(
        "Le client AI n'est pas initialisé. Impossible de générer un message.",
      );
      return null;
    }

    // Pour l'instant, on retourne le prompt comme si c'était la réponse de l'IA:
    this.logger.log(
      `[AI Mood] Requesting AI generation for prompt: "${prompt}"`,
    );

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: this.systemInstruction,
      },
    });

    return response.text;
  }
}
