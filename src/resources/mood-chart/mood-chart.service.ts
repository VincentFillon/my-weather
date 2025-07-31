import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { Model, Types } from 'mongoose';
import { UserHistory } from '../user-history/entities/user-history.entity';
import { MoodChartDataDto } from './dto/mood-chart-data.dto';

@Injectable()
export class MoodChartService {
  private logger: Logger = new Logger(MoodChartService.name);

  constructor(
    @InjectModel(UserHistory.name) private userHistoryModel: Model<UserHistory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getAllUserMoodsForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<UserHistory[]> {
    return this.userHistoryModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('user')
      .populate('mood');
  }

  private calculateDominantMoodForUser(
    userHistory: UserHistory[],
    date: Date,
  ): number | null {
    if (userHistory.length === 0) {
      return null;
    }

    const startOfDay = moment(date).startOf('day');
    const endOfDay = moment(date).isSame(moment(), 'day')
      ? moment()
      : moment(date).endOf('day');

    // Trier l'historique par date de création
    userHistory.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const moodDurations: { [moodOrder: number]: number } = {};
    let previousEntryTime = startOfDay;

    for (let i = 0; i < userHistory.length; i++) {
      const currentEntry = userHistory[i];
      const currentEntryTime = moment(currentEntry.createdAt);

      // La durée de l'humeur précédente est calculée jusqu'à l'entrée actuelle
      const duration = currentEntryTime.diff(previousEntryTime, 'minutes');

      if (i > 0 && userHistory[i - 1].mood) {
        const previousMoodOrder = userHistory[i - 1].mood.order;
        moodDurations[previousMoodOrder] =
          (moodDurations[previousMoodOrder] || 0) + duration;
      }

      previousEntryTime = currentEntryTime;
    }

    // Ajouter la durée de la dernière humeur jusqu'à la fin de la journée
    if (userHistory.length > 0 && userHistory[userHistory.length - 1].mood) {
      const lastMoodOrder = userHistory[userHistory.length - 1].mood.order;
      const duration = endOfDay.diff(previousEntryTime, 'minutes');
      moodDurations[lastMoodOrder] =
        (moodDurations[lastMoodOrder] || 0) + duration;
    }

    let dominantMoodOrder: number | null = null;
    let maxDuration = -1;

    for (const moodOrder in moodDurations) {
      if (moodDurations[moodOrder] > maxDuration) {
        maxDuration = moodDurations[moodOrder];
        dominantMoodOrder = parseInt(moodOrder, 10);
      }
    }
    return dominantMoodOrder;
  }

  private async calculateMedianMoodForDate(date: Date): Promise<number> {
    // this.logger.debug(
    //   `Calcul de l'humeur médiane pondérée pour la date : ${moment(date).format('YYYY-MM-DD')}`,
    // );

    const cacheKey = `median_mood_weighted_${moment(date).format('YYYY-MM-DD')}`;
    let medianMood = await this.cacheManager.get<number>(cacheKey);

    if (moment(date).isSame(moment(), 'day')) {
      medianMood = null; // Toujours recalculer pour aujourd'hui
    }

    if (medianMood === undefined || medianMood === null) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();

      const allUserHistories = await this.getAllUserMoodsForDateRange(
        startOfDay,
        endOfDay,
      );

      // this.logger.debug(
      //   `Historique des changements d'humeurs pour la journée : ${allUserHistories.length} entrées trouvées`,
      // );

      // Regrouper l'historique par utilisateur
      const userHistoriesMap = new Map<string, UserHistory[]>();
      for (const history of allUserHistories) {
        const userId = history.user._id.toString();
        if (!userHistoriesMap.has(userId)) {
          userHistoriesMap.set(userId, []);
        }
        userHistoriesMap.get(userId).push(history);
      }

      const dominantMoodOrders: number[] = [];
      for (const [userId, histories] of userHistoriesMap.entries()) {
        const dominantMood = this.calculateDominantMoodForUser(histories, date);
        if (dominantMood !== null) {
          dominantMoodOrders.push(dominantMood);
        }
      }

      // this.logger.debug(
      //   `Ordres des humeurs dominantes par utilisateur : ${dominantMoodOrders.length} entrées`,
      // );

      if (dominantMoodOrders.length === 0) {
        medianMood = null; // Ne rien afficher si aucune humeur n'est trouvée
      } else {
        dominantMoodOrders.sort((a, b) => a - b);
        const mid = Math.floor(dominantMoodOrders.length / 2);
        medianMood =
          dominantMoodOrders.length % 2 === 0
            ? (dominantMoodOrders[mid - 1] + dominantMoodOrders[mid]) / 2
            : dominantMoodOrders[mid];
      }
      // this.logger.debug(`Médiane pondérée calculée : ${medianMood}`);
      await this.cacheManager.set(cacheKey, medianMood, 60 * 60 * 24); // Cache pour 24 heures
    } else {
      // this.logger.debug(
      //   `Médiane pondérée récupérée du cache ('${cacheKey}') : ${medianMood}`,
      // );
    }
    return medianMood;
  }

  private async getUserMoodForDate(
    userId: string,
    date: Date,
  ): Promise<number> {
    // this.logger.debug(
    //   `Calcul de l'humeur de l'utilisateur ['${userId}'] pour la date : ${moment(date).format('YYYY-MM-DD')}`,
    // );

    const cacheKey = `user_mood_${userId}_${moment(date).format('YYYY-MM-DD')}`;
    let userMood = await this.cacheManager.get<number>(cacheKey);

    if (moment(date).isSame(moment(), 'day')) {
      userMood = null; // Toujours recalculer pour aujourd'hui
    }

    if (userMood === undefined || userMood === null) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();

      const userHistory = await this.userHistoryModel
        .find({
          user: new Types.ObjectId(userId),
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
        .populate('mood');

      // this.logger.debug(
      //   `Historique des changements d'humeurs de l'utilisateur ['${userId}'] : ${userHistory.length} entrées trouvées`,
      // );

      const dominantMood = this.calculateDominantMoodForUser(userHistory, date);

      if (dominantMood === null) {
        userMood = null; // Ne rien afficher si aucune humeur n'est trouvée
      } else {
        userMood = dominantMood;
      }
      // this.logger.debug(`Humeur de l'utilisateur calculée : ${userMood}`);
      await this.cacheManager.set(cacheKey, userMood, 60 * 60 * 24); // Cache pour 24 heures
    } else {
      // this.logger.debug(
      //   `Humeur de l'utilisateur récupérée du cache ('${cacheKey}') : ${userMood}`,
      // );
    }
    return userMood;
  }

  async getMoodChartData(userId: string, days: number = 7): Promise<MoodChartDataDto[]> {
    // this.logger.debug(
    //   `Calcul de l'humeur médiane de l'utilisateur ['${userId}'] sur les ${days} derniers jours`,
    // );
    const chartData: MoodChartDataDto[] = [];
    const today = moment().startOf('day');

    for (let i = (days - 1); i >= 0; i--) {
      const date = today.clone().subtract(i, 'days').toDate();
      const userMoodOrder = await this.getUserMoodForDate(userId, date);
      let medianMoodOrder = await this.calculateMedianMoodForDate(date);

      chartData.push({
        date: moment(date).format('YYYY-MM-DD'),
        userMoodOrder,
        medianMoodOrder,
      });
    }
    return chartData;
  }
}
