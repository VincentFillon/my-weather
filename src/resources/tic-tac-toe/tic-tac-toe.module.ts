import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import {
  PlayerGames,
  PlayerGamesSchema,
} from 'src/resources/tic-tac-toe/entities/player-games.entity';
import {
  TicTacToe,
  TicTacToeSchema,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';
import { UserModule } from 'src/resources/user/user.module';
import { UserExistsValidator } from 'src/validators/user-exists.validator';
import {
  TicTacToePlayer,
  TicTacToePlayerSchema,
} from './entities/tic-tac-toe-player.entity';
import { TicTacToeGateway } from './tic-tac-toe.gateway';
import { TicTacToeService } from './tic-tac-toe.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TicTacToe.name, schema: TicTacToeSchema },
      { name: TicTacToePlayer.name, schema: TicTacToePlayerSchema },
      { name: PlayerGames.name, schema: PlayerGamesSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
    forwardRef(() => AuthModule),
  ],
  providers: [TicTacToeGateway, TicTacToeService, UserExistsValidator],
})
export class TicTacToeModule {}
