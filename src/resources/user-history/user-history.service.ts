import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserHistoryFilters } from 'src/resources/user-history/dto/user-history.filters';
import {
  UserHistory,
  UserHistoryDocument,
} from 'src/resources/user-history/entities/user-history.entity';
import { User } from 'src/resources/user/entities/user.entity';
import { PaginatedResults } from 'src/utils/paginated.results';

@Injectable()
export class UserHistoryService {
  constructor(
    @InjectModel(UserHistory.name) private userHistoryModel: Model<UserHistory>,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('user.mood.updated')
  async create(
    user: User,
    updatedBy?: User | null,
  ): Promise<UserHistoryDocument> {
    const userHistory = new this.userHistoryModel({
      user,
      mood: user.mood,
      updatedBy: updatedBy || null,
    });

    await userHistory.save();

    if (updatedBy && updatedBy._id.toString() === user._id.toString()) {
      this.eventEmitter.emit('user.history.updated', userHistory);
    }

    return userHistory;
  }

  findAll(): Promise<UserHistoryDocument[]> {
    return this.userHistoryModel
      .find()
      .populate('user')
      .populate('mood')
      .populate('updatedBy')
      .exec();
  }

  findOne(id: string): Promise<UserHistoryDocument> {
    return this.userHistoryModel
      .findById(id)
      .populate('user')
      .populate('mood')
      .populate('updatedBy')
      .exec();
  }

  findByUser(user: string): Promise<UserHistoryDocument[]> {
    return this.userHistoryModel
      .find({ user: new Types.ObjectId(user) })
      .populate('user')
      .populate('mood')
      .populate('updatedBy')
      .exec();
  }

  async findByFilters(
    filters: UserHistoryFilters,
  ): Promise<PaginatedResults<UserHistoryDocument>> {
    const queryFilters: any = {};
    if (filters.userId) {
      queryFilters.user = new Types.ObjectId(filters.userId);
    }
    if (filters.moodId) {
      queryFilters.mood = new Types.ObjectId(filters.moodId);
    }
    if (filters.updatedById) {
      queryFilters.updatedBy = new Types.ObjectId(filters.updatedById);
    }
    if (filters.from && filters.to) {
      queryFilters.createdAt = { $gte: filters.from, $lte: filters.to };
    } else if (filters.from) {
      queryFilters.createdAt = { $gte: filters.from };
    } else if (filters.to) {
      queryFilters.createdAt = { $lte: filters.to };
    }

    let results: UserHistoryDocument[] = [];
    let total: number = 0;
    if (filters.limit) {
      total = await this.userHistoryModel.countDocuments(queryFilters).exec();
      results = await this.userHistoryModel
        .find(queryFilters)
        .populate('user')
        .populate('mood')
        .populate('updatedBy')
        .limit(filters.limit)
        .skip(filters.skip || 0)
        .exec();
    } else {
      results = await this.userHistoryModel
        .find(queryFilters)
        .populate('user')
        .populate('mood')
        .populate('updatedBy')
        .exec();
      total = results.length;
    }

    return new PaginatedResults<UserHistoryDocument>(results, total);
  }

  @OnEvent('user.removed')
  async removeByUser(userId: string): Promise<UserHistoryDocument[]> {
    const userHistory = await this.findByUser(userId);
    for (const history of userHistory) {
      await history.deleteOne().exec();
    }
    return userHistory;
  }
}
