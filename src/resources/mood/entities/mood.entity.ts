import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Group } from 'src/resources/group/entities/group.entity';

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

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  })
  group: Group | mongoose.Types.ObjectId;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const MoodSchema = SchemaFactory.createForClass(Mood);
