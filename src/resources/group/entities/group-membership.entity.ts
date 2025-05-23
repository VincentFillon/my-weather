import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Group } from 'src/resources/group/entities/group.entity';
import { GroupRole } from 'src/resources/group/enums/group-role.enum';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type GroupMembershipDocument = GroupMembership & Document;

@Schema({ timestamps: true })
export class GroupMembership {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: User | mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  })
  group: Group | mongoose.Types.ObjectId;

  @Prop({
    required: true,
    enum: GroupRole,
    type: String,
    default: GroupRole.MEMBER,
  })
  role: GroupRole;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Mood' })
  mood: Mood | mongoose.Types.ObjectId;
}

export const GroupMembershipSchema =
  SchemaFactory.createForClass(GroupMembership);
// Index unique pour s'assurer qu'un user n'a qu'un rôle par groupe
GroupMembershipSchema.index({ user: 1, group: 1 }, { unique: true });
