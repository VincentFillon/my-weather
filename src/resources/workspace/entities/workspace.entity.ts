import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkspaceDocument = Workspace & Document;

@Schema({ timestamps: true })
export class Workspace {
  @Prop({ required: true, unique: true })
  name: string;
}
export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
