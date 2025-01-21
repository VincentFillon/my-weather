import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from 'src/resources/auth/enums/role.enum';
import { Mood } from '../../mood/entities/mood.entity';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: Role, default: Role.USER })
  role: Role = Role.USER;

  @Prop()
  image?: string;

  @Prop({ type: Types.ObjectId, ref: 'Mood' })
  mood: Mood | null = null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updateddAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
