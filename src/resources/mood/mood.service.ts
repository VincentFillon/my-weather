import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mood, MoodDocument } from 'src/resources/mood/entities/mood.entity';
import { UserDocument } from 'src/resources/user/entities/user.entity';
import { UserService } from 'src/resources/user/user.service';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';

@Injectable()
export class MoodService {
  constructor(
    @InjectModel(Mood.name) private moodModel: Model<Mood>,
    private userService: UserService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createMoodDto: CreateMoodDto): Promise<MoodDocument> {
    const mood = new this.moodModel(createMoodDto);
    return mood.save();
  }

  findAll(groupId: string): Promise<MoodDocument[]> {
    return this.moodModel.find({ group: groupId }).exec();
  }

  findOne(id: string): Promise<MoodDocument> {
    return this.moodModel.findById(id).exec();
  }

  async update(
    id: string,
    updateMoodDto: UpdateMoodDto,
  ): Promise<MoodDocument> {
    return this.moodModel
      .findByIdAndUpdate(id, updateMoodDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<MoodDocument> {
    const users: UserDocument[] = await this.userService.findByMood(id);
    for (const user of users) {
      user.mood = null;
      await user.save();
      this.eventEmitter.emit('user.mood.updated', user, null);
    }

    return this.moodModel.findByIdAndDelete(id).exec();
  }
}
