import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/resources/user/entities/user.entity';

export type MessageDocument = HydratedDocument<Message>;

export class MessageReaction {
  @Prop({ required: true })
  emoji: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  userIds: mongoose.Types.ObjectId[];
}

@Schema({ timestamps: true })
export class Message {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true })
  room: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  sender: User | null;

  @Prop({
    type: String,
    required: function (this: Message) {
      return !this.mediaUrl;
    },
  })
  content: string;

  @Prop({ type: String, required: false })
  mediaUrl?: string;

  @Prop({ type: [MessageReaction], default: [] })
  reactions: MessageReaction[];

  @Prop()
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
