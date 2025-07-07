import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MoodChartController } from 'src/resources/mood-chart/mood-chart.controller';
import { MoodChartService } from 'src/resources/mood-chart/mood-chart.service';
import {
  UserHistory,
  UserHistorySchema,
} from 'src/resources/user-history/entities/user-history.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserHistory.name, schema: UserHistorySchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    CacheModule.register({
      ttl: 5 * 60 * 1000, // temps de vie du cache en millisecondes (5 minutes)
      max: 100, // nombre maximum d'éléments dans le cache
    }),
  ],
  providers: [MoodChartService],
  controllers: [MoodChartController],
})
export class MoodChartModule {}
