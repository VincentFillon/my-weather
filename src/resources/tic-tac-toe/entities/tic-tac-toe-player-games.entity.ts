import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { TicTacToe } from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';

export type TicTacToePlayerGamesDocument = HydratedDocument<TicTacToePlayerGames>;

@Schema({ _id: false, versionKey: false })
export class TicTacToePlayerGames {
  @Prop({ type: Number, required: true, default: 0 })
  nb: number = 0;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicTacToe' }],
    required: true,
    default: [],
  })
  games: TicTacToe[] = [];
}

export const TicTacToePlayerGamesSchema = SchemaFactory.createForClass(TicTacToePlayerGames);
