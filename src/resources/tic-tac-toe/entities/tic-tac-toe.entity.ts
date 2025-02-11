import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/resources/user/entities/user.entity';

export type TicTacToeValue = '' | 'X' | 'O';

export type TicTacToeDocument = HydratedDocument<TicTacToe>;

@Schema({ timestamps: true })
export class TicTacToe {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  playerX: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  playerO?: User | null;

  @Prop({ type: [String], default: Array(9).fill('') })
  grid: TicTacToeValue[] = Array(9).fill('');

  @Prop({ required: true })
  firstPlayer: 'X' | 'O';

  @Prop({ type: Number, default: 1 })
  turn: number = 1;

  @Prop()
  winner?: TicTacToeValue;

  @Prop({ type: Boolean, default: false })
  isFinished: boolean = false;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TicTacToeSchema = SchemaFactory.createForClass(TicTacToe);
