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
}