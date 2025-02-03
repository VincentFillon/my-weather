import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import {
  PlayerGames,
  PlayerGamesSchema,
} from 'src/resources/tic-tac-toe/entities/player-games.entity';
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

  @Prop({ type: PlayerGamesSchema, required: true })
  wins: PlayerGames;

  @Prop({ type: PlayerGamesSchema, required: true })
  draws: PlayerGames;

  @Prop({ type: PlayerGamesSchema, required: true })
  losses: PlayerGames;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TicTacToePlayerSchema =
  SchemaFactory.createForClass(TicTacToePlayer);
