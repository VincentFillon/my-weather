import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mood, MoodSchema } from 'src/resources/mood/entities/mood.entity';
import { MoodGateway } from './mood.gateway';
import { MoodService } from './mood.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mood.name, schema: MoodSchema }]),
  ],
  providers: [MoodGateway, MoodService],
})
export class MoodModule {}
