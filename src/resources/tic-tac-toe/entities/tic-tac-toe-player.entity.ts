import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import {
  TicTacToePlayerGames,
  TicTacToePlayerGamesSchema,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe-player-games.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type TicTacToePlayerDocument = HydratedDocument<TicTacToePlayer>;

@Schema({ timestamps: true })
export class TicTacToePlayer {
  _id: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  player: User;

  @Prop({ type: TicTacToePlayerGamesSchema, required: true })
  wins: TicTacToePlayerGames;

  @Prop({ type: TicTacToePlayerGamesSchema, required: true })
  draws: TicTacToePlayerGames;

  @Prop({ type: TicTacToePlayerGamesSchema, required: true })
  losses: TicTacToePlayerGames;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TicTacToePlayerSchema =
  SchemaFactory.createForClass(TicTacToePlayer);
