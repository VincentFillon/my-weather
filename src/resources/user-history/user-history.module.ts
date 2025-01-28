import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import {
  UserHistory,
  UserHistorySchema,
} from 'src/resources/user-history/entities/user-history.entity';
import { UserHistoryService } from 'src/resources/user-history/user-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserHistory.name, schema: UserHistorySchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    forwardRef(() => AuthModule),
  ],
  providers: [UserHistoryService],
  exports: [UserHistoryService],
})
export class UserHistoryModule {}
