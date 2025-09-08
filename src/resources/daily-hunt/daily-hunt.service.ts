import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { User } from '../user/entities/user.entity';
import {
  DailyHuntFind,
  DailyHuntFindDocument,
} from './entities/daily-hunt-find.entity';
import { DailyHunt, DailyHuntDocument } from './entities/daily-hunt.entity';

@Injectable()
export class DailyHuntService {
  constructor(
    @InjectModel(DailyHunt.name)
    private readonly dailyHuntModel: Model<DailyHuntDocument>,
    @InjectModel(DailyHuntFind.name)
    private readonly dailyHuntFindModel: Model<DailyHuntFindDocument>,
  ) {}

  async getTodaysHunt() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hunt = await this.dailyHuntModel.findOne({ date: today }).exec();

    if (!hunt) {
      hunt = await this.createDailyHunt(today);
    }

    return hunt;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.createDailyHunt(today);
  }

  async createDailyHunt(date: Date) {
    const newHunt = new this.dailyHuntModel({
      date,
      positionX: Math.random() * 100,
      positionY: Math.random() * 100,
    });
    return newHunt.save();
  }

  async getTodaysFinds() {
    const todaysHunt = await this.getTodaysHunt();
    if (!todaysHunt) {
      return [];
    }
    return this.dailyHuntFindModel
      .find({ dailyHunt: todaysHunt._id })
      .sort({ rank: 1 })
      .populate('user')
      .exec();
  }

  async findHunt(user: User) {
    const todaysHunt = await this.getTodaysHunt();

    const existingFind = await this.dailyHuntFindModel
      .findOne({
        user: user._id,
        dailyHunt: todaysHunt._id,
      })
      .exec();

    if (existingFind) {
      return {
        message: 'Already found',
        rank: existingFind.rank,
      };
    }

    const rank =
      (await this.dailyHuntFindModel.countDocuments({
        dailyHunt: todaysHunt._id,
      })) + 1;

    const newFind = new this.dailyHuntFindModel({
      user: user._id,
      dailyHunt: todaysHunt._id,
      rank,
    });

    await newFind.save();

    return {
      message: 'Success',
      rank,
    };
  }

  async getLeaderboardData(period: string) {
    // Calculer la date de début selon la période pour le classement
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '2weeks':
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '12months':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0); // Par défaut aujourd'hui
    }

    // Récupérer tous les hunts de la période pour le classement
    const hunts = await this.dailyHuntModel
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: -1 })
      .exec();

    // Toujours récupérer les 5 derniers jours pour les résultats individuels
    const lastFiveDaysStart = new Date();
    lastFiveDaysStart.setDate(lastFiveDaysStart.getDate() - 4); // -4 pour inclure aujourd'hui
    lastFiveDaysStart.setHours(0, 0, 0, 0);

    const lastFiveDaysHunts = await this.dailyHuntModel
      .find({
        date: { $gte: lastFiveDaysStart, $lte: endDate }
      })
      .sort({ date: -1 })
      .exec();

    const allHuntIds = [...new Set([...hunts.map(h => h._id), ...lastFiveDaysHunts.map(h => h._id)])];

    if (allHuntIds.length === 0) {
      return { leaderboard: [], lastFiveDays: [] };
    }

    // Récupérer tous les finds de ces hunts avec populate user
    const finds = await this.dailyHuntFindModel
      .find({ dailyHunt: { $in: allHuntIds } })
      .populate('user')
      .populate('dailyHunt')
      .sort({ 'dailyHunt.date': -1, rank: 1 })
      .exec();

    // Calculer les points par joueur (seulement pour la période sélectionnée)
    const playerStats = new Map();

    // D'abord, traiter tous les finds pour collecter les données des 5 derniers jours
    finds.forEach(find => {
      const userId = find.user._id.toString();
      if (!playerStats.has(userId)) {
        playerStats.set(userId, {
          user: find.user,
          totalPoints: 0,
          dailyResults: new Map()
        });
      }

      const stats = playerStats.get(userId);
      const huntDate = find.dailyHunt.date.toISOString().split('T')[0];

      // Stocker le résultat pour ce jour
      stats.dailyResults.set(huntDate, find.rank);
    });

    // Ensuite, calculer les points seulement pour les hunts de la période sélectionnée
    const periodHuntIds = hunts.map(h => h._id.toString());
    finds.forEach(find => {
      if (periodHuntIds.includes(find.dailyHunt._id.toString())) {
        const userId = find.user._id.toString();
        const stats = playerStats.get(userId);

        // Calcul des points selon le rang
        let points = 1; // Points par défaut pour les autres positions
        if (find.rank === 1) points = 5;
        else if (find.rank === 2) points = 4;
        else if (find.rank === 3) points = 3;

        stats.totalPoints += points;
      }
    });

    // Générer les 5 derniers jours
    const lastFiveDays = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      lastFiveDays.push(dateStr);
    }

    // Transformer en tableau et trier par points décroissants
    const leaderboard = Array.from(playerStats.values())
      .map(stats => ({
        user: {
          _id: stats.user._id,
          displayName: stats.user.displayName,
          image: stats.user.image
        },
        totalPoints: stats.totalPoints,
        lastFiveResults: lastFiveDays.map(date => stats.dailyResults.get(date) || 'NA')
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      leaderboard,
      lastFiveDays
    };
  }
}