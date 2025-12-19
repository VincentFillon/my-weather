import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationSubscriptionDocument = NotificationSubscription & Document;

@Schema()
class Keys {
  @Prop()
  p256dh: string;

  @Prop()
  auth: string;
}

@Schema()
export class NotificationSubscription {
  @Prop({ required: true })
  endpoint: string;

  @Prop({ type: Keys })
  keys: Keys;

  @Prop()
  userId?: string; // Optional: Link to a specific user if authenticated
}

export const NotificationSubscriptionSchema = SchemaFactory.createForClass(NotificationSubscription);
