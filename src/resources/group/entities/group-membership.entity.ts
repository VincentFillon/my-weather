import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';
import { GroupRole } from '../enums/group-role.enum';
import { Group } from './group.entity';

export type GroupMembershipDocument = HydratedDocument<GroupMembership>;

@Schema({ timestamps: true })
export class GroupMembership {
  _id: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true })
  group: Group;

  @Prop({ required: true, enum: GroupRole, default: GroupRole.USER })
  role: GroupRole = GroupRole.USER;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const GroupMembershipSchema =
  SchemaFactory.createForClass(GroupMembership);