import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Message } from 'src/resources/chat/entities/message.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type RoomDocument = HydratedDocument<Room>;

@Schema({ timestamps: true })
export class Room {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  image?: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
  })
  users: User[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  creator: User;

  @Prop({ type: Boolean, default: false })
  isChatBot?: boolean; // Indique si la room est un bot de chat

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  lastMessage?: Message; // Dernier message envoyé dans la room (pour affichage dans la liste des rooms)
  unreadCount?: number; // Nombre de messages non lus dans la room (propre à l'utilisateur qui récupère la room)
}

export const RoomSchema = SchemaFactory.createForClass(Room);
