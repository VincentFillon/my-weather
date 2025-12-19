import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from 'src/resources/user/entities/user.entity';
import { Frame, FrameSchema } from './entities/frame.entity';
import { UserGateway } from './user.gateway';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Frame.name, schema: FrameSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    forwardRef(() => AuthModule),
    NotificationModule,
  ],
  providers: [UserGateway, UserService],
  exports: [UserService],
})
export class UserModule {}
