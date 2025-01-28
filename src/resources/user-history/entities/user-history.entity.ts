import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type UserHistoryDocument = HydratedDocument<UserHistory>;

@Schema({ timestamps: true })
export class UserHistory {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Mood' })
  mood: Mood | null = null;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: User | null = null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserHistorySchema = SchemaFactory.createForClass(UserHistory);
