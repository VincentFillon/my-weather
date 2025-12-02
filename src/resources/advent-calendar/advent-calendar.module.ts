import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdventCalendarService } from './advent-calendar.service';
import { AdventCalendarController } from './advent-calendar.controller';
import {
  AdventCalendarDay,
  AdventCalendarDaySchema,
} from './entities/advent-calendar-day.entity';
import {
  AdventCalendarNotification,
  AdventCalendarNotificationSchema,
} from './entities/advent-calendar-notification.entity';
import { AdventCalendarGateway } from './advent-calendar.gateway';
import { JwtModule } from '@nestjs/jwt';
import {
  AdventCalendarUserOpen,
  AdventCalendarUserOpenSchema,
} from './entities/advent-calendar-user-open.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdventCalendarDay.name, schema: AdventCalendarDaySchema },
      {
        name: AdventCalendarUserOpen.name,
        schema: AdventCalendarUserOpenSchema,
      },
      {
        name: AdventCalendarNotification.name,
        schema: AdventCalendarNotificationSchema,
      },
    ]),
    UserModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AdventCalendarController],
  providers: [AdventCalendarService, AdventCalendarGateway],
  exports: [AdventCalendarService],
})
export class AdventCalendarModule {}
