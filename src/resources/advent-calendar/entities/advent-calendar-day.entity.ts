import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdventCalendarDayDocument = HydratedDocument<AdventCalendarDay>;

@Schema({ timestamps: true })
export class AdventCalendarDay {
  @Prop({ required: true, unique: true, min: 1, max: 24 })
  day: number;

  @Prop({ required: true })
  content: string; // URL of image or text of quote

  @Prop({ required: true, enum: ['image', 'quote'] })
  type: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AdventCalendarDaySchema =
  SchemaFactory.createForClass(AdventCalendarDay);
