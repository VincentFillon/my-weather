import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';

@Injectable()
export class MoodService {
  constructor(@InjectModel(Mood.name) private moodModel: Model<Mood>) {}

  async create(createMoodDto: CreateMoodDto): Promise<Mood> {
    const mood = new this.moodModel(createMoodDto);
    return mood.save();
  }

  findAll(): Promise<Mood[]> {
    return this.moodModel.find().exec();
  }

  findOne(id: string): Promise<Mood> {
    return this.moodModel.findById(id).exec();
  }

  update(id: string, updateMoodDto: UpdateMoodDto) {
    return this.moodModel.findByIdAndUpdate(id, updateMoodDto).exec();
  }

  remove(id: string) {
    return this.moodModel.findByIdAndDelete(id).exec();
  }
}
