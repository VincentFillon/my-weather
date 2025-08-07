import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DailyHuntDocument = HydratedDocument<DailyHunt>;

@Schema({ timestamps: true })
export class DailyHunt {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  date: Date;

  @Prop({ required: true })
  positionX: number;

  @Prop({ required: true })
  positionY: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const DailyHuntSchema = SchemaFactory.createForClass(DailyHunt);