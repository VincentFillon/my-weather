import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Group } from 'src/resources/group/entities/group.entity';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type UserHistoryDocument = HydratedDocument<UserHistory>;

@Schema({ timestamps: true })
export class UserHistory {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true })
  group: Group | mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Mood' })
  mood: Mood | null = null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  updatedBy: User | null = null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserHistorySchema = SchemaFactory.createForClass(UserHistory);
