import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';
import { DailyHunt } from './daily-hunt.entity';

export type DailyHuntFindDocument = HydratedDocument<DailyHuntFind>;

@Schema({ timestamps: true })
export class DailyHuntFind {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyHunt',
    required: true,
  })
  dailyHunt: DailyHunt;

  @Prop({ required: true })
  rank: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const DailyHuntFindSchema = SchemaFactory.createForClass(DailyHuntFind);

DailyHuntFindSchema.index({ user: 1, dailyHunt: 1 }, { unique: true });