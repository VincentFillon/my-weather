import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyHuntService } from 'src/resources/daily-hunt/daily-hunt.service';
import { UserModule } from '../user/user.module';
import { DailyHuntGateway } from './daily-hunt.gateway';
import {
  DailyHuntFind,
  DailyHuntFindSchema,
} from './entities/daily-hunt-find.entity';
import { DailyHunt, DailyHuntSchema } from './entities/daily-hunt.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyHunt.name, schema: DailyHuntSchema },
      { name: DailyHuntFind.name, schema: DailyHuntFindSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
  ],
  controllers: [],
  providers: [DailyHuntService, DailyHuntGateway],
  exports: [DailyHuntService],
})
export class DailyHuntModule {}
