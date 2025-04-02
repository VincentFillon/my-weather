import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/resources/user/entities/user.entity';

export type Position = { x: number; y: number };

export type PongDocument = HydratedDocument<Pong>;

@Schema({ timestamps: true })
export class Pong {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  player1: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  player2?: User | null;

  @Prop({ type: Object, default: { x: 0, y: 75 } })
  player1RacketPosition: Position;

  @Prop({ type: Number, default: 0 })
  player1RacketVelocity: number;

  @Prop({ type: Object, default: { x: 200, y: 75 } })
  player2RacketPosition: Position;

  @Prop({ type: Number, default: 0 })
  player2RacketVelocity: number;

  @Prop({ type: Object, required: true, default: { x: 100, y: 75 } })
  ballPosition: Position;

  @Prop({ type: Object, required: true, default: { x: 101, y: 75 } })
  ballDirection: Position;

  @Prop({ type: Number, required: true, default: 5 })
  ballVelocity: number;

  @Prop({ type: Boolean, default: false })
  isPaused: boolean = false;

  @Prop({ type: Number })
  pausedBy?: 1 | 2;

  @Prop({ type: Boolean, default: false })
  isFinished: boolean = false;

  @Prop({ type: Number })
  winner?: 1 | 2;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PongSchema = SchemaFactory.createForClass(Pong);
