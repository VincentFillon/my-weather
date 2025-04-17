import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Workspace } from 'src/resources/workspace/entities/workspace.entity';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop()
  color?: string;

  @Prop()
  image?: string; // URL/path

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  })
  workspace: Workspace | mongoose.Types.ObjectId; // Référence au Workspace parent
}
export const GroupSchema = SchemaFactory.createForClass(Group);
