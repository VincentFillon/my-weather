import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/resources/user/entities/user.entity';
import { Workspace } from 'src/resources/workspace/entities/workspace.entity';
import { WorkspaceRole } from 'src/resources/workspace/enums/workspace-role.enum';

export type WorkspaceMembershipDocument = WorkspaceMembership & Document;

@Schema({ timestamps: true })
export class WorkspaceMembership {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: User | mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  })
  workspace: Workspace | mongoose.Types.ObjectId;

  @Prop({ required: true, enum: WorkspaceRole, type: String }) // Stocker l'enum comme String
  role: WorkspaceRole;
}

export const WorkspaceMembershipSchema =
  SchemaFactory.createForClass(WorkspaceMembership);
// Index unique pour s'assurer qu'un user n'a qu'un rôle par workspace
WorkspaceMembershipSchema.index({ user: 1, workspace: 1 }, { unique: true });
