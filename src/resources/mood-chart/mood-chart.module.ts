import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mood } from '../mood/entities/mood.entity';
import { UserHistory } from '../user-history/entities/user-history.entity';
import { MoodChartController } from './mood-chart.controller';
import { MoodChartService } from './mood-chart.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserHistory, Mood]),
    CacheModule.register({
      ttl: 5 * 60 * 1000, // temps de vie du cache en millisecondes (5 minutes)
      max: 100, // nombre maximum d'éléments dans le cache
    }),
  ],
  providers: [MoodChartService],
  controllers: [MoodChartController],
})
export class MoodChartModule {}