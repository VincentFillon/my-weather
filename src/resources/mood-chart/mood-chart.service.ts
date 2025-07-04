import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import * as moment from 'moment';
import { Types } from 'mongoose';
import { Between, Repository } from 'typeorm';
import { Mood } from '../mood/entities/mood.entity';
import { UserHistory } from '../user-history/entities/user-history.entity';
import { MoodChartDataDto } from './dto/mood-chart-data.dto';

@Injectable()
export class MoodChartService {
  constructor(
    @InjectRepository(UserHistory)
    private userHistoryRepository: Repository<UserHistory>,
    @InjectRepository(Mood)
    private moodRepository: Repository<Mood>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getAllUserMoodsForDateRange(startDate: Date, endDate: Date): Promise<UserHistory[]> {
    return this.userHistoryRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['mood'],
    });
  }

  private async calculateMedianMoodForDate(date: Date): Promise<number> {
    const cacheKey = `median_mood_${moment(date).format('YYYY-MM-DD')}`;
    let medianMood = await this.cacheManager.get<number>(cacheKey);

    if (medianMood === undefined || medianMood === null) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();

      const allMoods = await this.userHistoryRepository.find({
        where: {
          createdAt: Between(startOfDay, endOfDay),
        },
        relations: ['mood'],
      });

      const moodOrders = allMoods.map(history => history.mood.order).sort((a, b) => a - b);

      if (moodOrders.length === 0) {
        medianMood = 0; // Ou une autre valeur par défaut si aucune humeur n'est trouvée
      } else {
        const mid = Math.floor(moodOrders.length / 2);
        medianMood = moodOrders.length % 2 === 0 ? (moodOrders[mid - 1] + moodOrders[mid]) / 2 : moodOrders[mid];
      }
      await this.cacheManager.set(cacheKey, medianMood, 60 * 60 * 24); // Cache pour 24 heures
    }
    return medianMood;
  }

  private async getUserMoodForDate(userId: number, date: Date): Promise<number> {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    const userHistory = await this.userHistoryRepository.findOne({
      where: {
        user: { _id: new Types.ObjectId(userId) },
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['mood'],
    });
    return userHistory ? userHistory.mood.order : 0; // Retourne 0 si aucune humeur n'est trouvée pour l'utilisateur
  }

  async getMoodChartData(userId: number): Promise<MoodChartDataDto[]> {
    const chartData: MoodChartDataDto[] = [];
    const today = moment().startOf('day');

    for (let i = 6; i >= 0; i--) {
      const date = today.clone().subtract(i, 'days').toDate();
      const userMoodOrder = await this.getUserMoodForDate(userId, date);
      let medianMoodOrder = await this.calculateMedianMoodForDate(date);

      // Cacher l'humeur médiane sauf pour le point le plus récent
      if (i !== 0) {
        medianMoodOrder = 0; // Ou une autre valeur pour indiquer qu'elle est cachée
      }

      chartData.push({
        date: moment(date).format('YYYY-MM-DD'),
        userMoodOrder,
        medianMoodOrder,
      });
    }
    return chartData;
  }
}