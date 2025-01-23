import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MoodDocument = HydratedDocument<Mood>;

@Schema({ timestamps: true })
export class Mood {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  order: number;

  @Prop({ required: true })
  image: string;

  @Prop()
  sound?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updateddAt?: Date;
}

export const MoodSchema = SchemaFactory.createForClass(Mood);
