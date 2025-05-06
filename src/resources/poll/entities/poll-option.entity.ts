import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PollOptionDocument = HydratedDocument<PollOption>;

@Schema({ _id: true })
export class PollOption {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  text: string;
}

export const PollOptionSchema = SchemaFactory.createForClass(PollOption);
