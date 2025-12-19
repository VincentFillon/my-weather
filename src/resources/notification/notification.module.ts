import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationSubscription, NotificationSubscriptionSchema } from './schemas/notification-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NotificationSubscription.name, schema: NotificationSubscriptionSchema }]),
    JwtModule.register({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '12h' },
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
