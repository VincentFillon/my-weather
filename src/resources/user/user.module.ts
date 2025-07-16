import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import {
  GroupMembership,
  GroupMembershipSchema,
} from 'src/resources/group/entities/group-membership.entity';
import { User, UserSchema } from 'src/resources/user/entities/user.entity';
import { UserController } from './user.controller';
import { UserGateway } from './user.gateway';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GroupMembership.name, schema: GroupMembershipSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserGateway, UserService],
  exports: [UserService],
})
export class UserModule {}
