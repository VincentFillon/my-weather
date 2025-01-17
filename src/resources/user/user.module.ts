import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import { User, UserSchema } from 'src/resources/user/entities/user.entity';
import { UserGateway } from './user.gateway';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
  ],
  providers: [UserGateway, UserService],
  exports: [UserService],
})
export class UserModule {}
