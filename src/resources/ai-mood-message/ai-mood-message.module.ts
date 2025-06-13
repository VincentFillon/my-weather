import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GeminiModel,
  GeminiModelSchema,
} from 'src/resources/ai-mood-message/entities/gemini-model.entity';
import { MoodModule } from 'src/resources/mood/mood.module';
import { UserHistoryModule } from 'src/resources/user-history/user-history.module';
import { AiMoodMessageService } from './ai-mood-message.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GeminiModel.name, schema: GeminiModelSchema },
    ]),
    MoodModule,
    UserHistoryModule,
  ],
  providers: [AiMoodMessageService],
})
export class AiMoodMessageModule {}
