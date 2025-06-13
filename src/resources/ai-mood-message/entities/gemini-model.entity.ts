import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GeminiModelDocument = HydratedDocument<GeminiModel>;

@Schema({ timestamps: true })
export class GeminiModel {
  @Prop({ type: String, required: true })
  apiKey: string;
  @Prop({ type: String, required: true })
  modelName: string;
  @Prop({ type: String })
  systemInstruction?: string;
}

export const GeminiModelSchema = SchemaFactory.createForClass(GeminiModel);
