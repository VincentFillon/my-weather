import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import {
  PongPlayerGames,
  PongPlayerGamesSchema,
} from 'src/resources/pong/entities/pong-player-games.entity';
import {
  PongPlayer,
  PongPlayerSchema,
} from 'src/resources/pong/entities/pong-player.entity';
import { Pong, PongSchema } from 'src/resources/pong/entities/pong.entity';
import { UserModule } from 'src/resources/user/user.module';
import { UserExistsValidator } from 'src/validators/user-exists.validator';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pong.name, schema: PongSchema },
      { name: PongPlayer.name, schema: PongPlayerSchema },
      { name: PongPlayerGames.name, schema: PongPlayerGamesSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
    forwardRef(() => AuthModule),
  ],
  providers: [PongGateway, PongService, UserExistsValidator],
})
export class PongModule {}
