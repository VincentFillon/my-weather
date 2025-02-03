import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { TicTacToe } from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';

export type PlayerGamesDocument = HydratedDocument<PlayerGames>;

@Schema({ _id: false, versionKey: false })
export class PlayerGames {
  @Prop({ type: Number, required: true, default: 0 })
  nb: number = 0;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicTacToe' }],
    required: true,
    default: [],
  })
  games: TicTacToe[] = [];
}

export const PlayerGamesSchema = SchemaFactory.createForClass(PlayerGames);
