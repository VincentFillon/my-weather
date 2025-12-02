import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FrameDocument = HydratedDocument<Frame>;

@Schema({ timestamps: true })
export class Frame {
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  image: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FrameSchema = SchemaFactory.createForClass(Frame);
