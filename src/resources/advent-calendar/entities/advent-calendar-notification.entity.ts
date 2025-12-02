import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type AdventCalendarNotificationDocument =
  HydratedDocument<AdventCalendarNotification>;

@Schema({ timestamps: true })
export class AdventCalendarNotification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  lastNotificationDate: Date;
}

export const AdventCalendarNotificationSchema = SchemaFactory.createForClass(
  AdventCalendarNotification,
);
