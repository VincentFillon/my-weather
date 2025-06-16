import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GeminiModel,
  GeminiModelDocument,
} from 'src/resources/ai-mood-message/entities/gemini-model.entity';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { MoodService } from 'src/resources/mood/mood.service';
import { UserHistoryDocument } from 'src/resources/user-history/entities/user-history.entity';
import { UserHistoryService } from 'src/resources/user-history/user-history.service';

interface AiMoodPeriod {
  mood: Mood | null;
  from: Date; // Date de sélection de l'humeur
  duration: number; // Durée en millisecondes
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

  constructor(
    @InjectModel(GeminiModel.name)
    private geminiModel: Model<GeminiModelDocument>,
    private readonly moodService: MoodService,
    private readonly userHistoryService: UserHistoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async init() {
    const models = await this.geminiModel.find();
    if (!models || models.length === 0) {
      this.logger.error('No Gemini models found. AI Mood Bot will not work.');
      return;
    }
    this.ai = new GoogleGenAI({
      apiKey: models[0]?.apiKey,
    });
    this.model = models[0]?.modelName || 'gemini-2.0-flash-lite';
    this.systemInstruction =
      models[0]?.systemInstruction ||
      `Tu es un chatbot sarcastique et aigri avec un humour noir. Ton rôle est de réagir à un changement d'humeur de l'utilisateur par un message court, piquant, drôle et incisif.
Si l'utilisateur est souvent dans des humeurs positives, sois moqueur vis à vis de sa naïveté et de sa niaiserie.

Prends en compte le jour de la semaine et l'heure pour adapter ton ton :
- Le lundi matin, souligne la déprime, le manque de motivation, ou l'absurdité de commencer une nouvelle semaine.
- Le mercredi, fais allusion à la semaine interminable ("on n'est qu'au milieu, courage... ou pas").
- Le vendredi après-midi, sois un peu plus enthousiaste (façon sarcastique) sur l'arrivée du week-end.
- Le week-end, ironise sur le repos mérité ou sur la solitude existentielle du samedi soir.
- Si l'utilisateur définit son humeur pour la première fois de la semaine, accorde beaucoup moins d'importance à son humeur précédente ou à l'analyse de ses 7 derniers jours, insiste sur son humeur actuelle pour un début de semaine.`;
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
  ): string {
    // 1) Créer un mapping label → ordre (index de positivité)
    const moodIndex = new Map<string, number>();
    allMoods.forEach((m, i) => moodIndex.set(m.name, m.order));

    // 2) Filtrer l'historique sur les périodes valides
    const validPeriods = history.filter(
      (p) => p.mood && moodIndex.has(p.mood.name),
    );

    // 3) Totaliser la durée par humeur
    const durations = new Array(allMoods.length).fill(0);
    validPeriods.forEach((p) => {
      const idx = moodIndex.get(p.mood.name);
      durations[idx] += p.duration;
    });

    // 4) Déterminer l'humeur dominante
    const dominantIdx = durations
      .map((d, i) => ({ idx: i, d }))
      .reduce((a, b) => (b.d > a.d ? b : a)).idx;
    const dominantMood = allMoods.find((m) => m.order === dominantIdx).name;

    // 5) Calculer l'indice moyen pondéré par la durée
    const totalTime = durations.reduce((a, b) => a + b, 0) || 1;
    const avgIdx =
      durations.map((d, i) => d * i).reduce((a, b) => a + b, 0) / totalTime;

    // 6) Longueur de la série actuelle (streak) de la même humeur
    let streak = 0;
    for (let i = validPeriods.length - 1; i >= 0; i--) {
      if (validPeriods[i].mood.name === currentMood) streak++;
      else break;
    }

    // Récupérer les 5 dernières humeurs
    const lastMoods = validPeriods
      .slice(-5)
      .map((p) => `« ${p.mood.name} » (${p.duration / (1000 * 60)} min)`)
      .join(', ');

    // 7) Évaluer si le changement est inhabituel
    const prevMood =
      validPeriods.length > 0
        ? validPeriods[validPeriods.length - 1].mood
        : null;
    const changeUnusual =
      prevMood &&
      moodIndex.has(prevMood.name) &&
      Math.abs(
        (moodIndex.get(currentMood) ?? 0) - moodIndex.get(prevMood.name),
      ) >=
        allMoods.length / 2;

    // 8) Construire le texte d'analyse
    const parts: string[] = [];
    parts.push(`Humeur dominante sur 7j : « ${dominantMood} »`);
    parts.push(
      `Indice moyen : ${avgIdx.toFixed(2)} (0 = très positif, ${allMoods.length - 1} = très négatif)`,
    );
    parts.push(`5 dernières humeurs : ${lastMoods}`);
    if (streak > 1) {
      parts.push(
        `Série actuelle : ${streak} sélection${streak > 1 ? 's' : ''} de « ${currentMood} »`,
      );
    }
    if (changeUnusual) {
      parts.push("Changement atypique par rapport à l'humeur précédente.");
    }

    return parts.join(' \n');
  }

  private buildAiPrompt(
    moods: Mood[],
    currentMood: Mood,
    moodHistory: AiMoodPeriod[],
  ): string {
    const analysis = this.analyzeTrends(moods, moodHistory, currentMood.name);

    const now = new Date();
    const weekday = now.toLocaleString('fr-FR', { weekday: 'long' });
    const hour = now.getHours();

    // Si c'est la première fois de la semaine que l'utilisateur définit son humeur
    let firstPick = '';
    if (moodHistory[moodHistory.length - 1].from.getDay() !== now.getDay()) {
      if (weekday === 'lundi') {
        firstPick = ` (c'est la première fois de la semaine que l'utilisateur définit son humeur)`;
      } else {
        firstPick = ` (c'est la première fois de la journée que l'utilisateur définit son humeur)`;
      }
    }

    // Logique pour construire un prompt intelligent basé sur l'humeur actuelle et l'historique
    return `L'utilisateur a changé son humeur. Voici les détails :

Liste des humeurs disponibles :
${moods
  .sort((a, b) => a.order - b.order)
  .map((m) => `« ${m.name} » (Indice: ${m.order}) `)
  .join('\n')}

Jour actuel : ${weekday}
Heure actuelle : ${hour}h

Humeur actuelle de l'utilisateur : « ${currentMood.name} »${firstPick}
Humeur précedente de l'utilisateur : « ${moodHistory[moodHistory.length - 1].mood.name} »

Analyse des 7 derniers jours :
${analysis}

Génère une phrase dans le style : moqueuse, cinglante. PAS de message neutre ni trop gentil.`;
  }

  private async generateAiMessage(prompt: string): Promise<string | null> {
    if (!this.ai) {
      // On essaye de réinitialiser l'IA si elle n'est pas initialisée
      await this.init();
      if (!this.ai) {
        this.logger.error('AI client is not initialized.');
        return null;
      }
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
