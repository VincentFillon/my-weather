import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type AdventCalendarUserOpenDocument =
  HydratedDocument<AdventCalendarUserOpen>;

@Schema({ timestamps: true })
export class AdventCalendarUserOpen {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true, min: 1, max: 24 })
  day: number;

  @Prop()
  openedAt: Date;
}

export const AdventCalendarUserOpenSchema = SchemaFactory.createForClass(
  AdventCalendarUserOpen,
);
