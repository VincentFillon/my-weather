import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Role } from 'src/resources/auth/enums/role.enum';
import { GroupMembership } from 'src/resources/group/entities/group-membership.entity';
import { Group } from '../../group/entities/group.entity';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  displayName: string;

  @Prop({ required: true, enum: Role, default: Role.USER })
  role: Role = Role.USER;

  @Prop()
  image?: string;

  @Prop()
  moodUpdatedAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group' })
  activeGroup?: Group;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GroupMembership' }] })
  memberships: GroupMembership[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update && update.$set && update.$set.mood !== undefined) {
    update.$set.moodUpdatedAt = new Date();
  }
  next();
});
