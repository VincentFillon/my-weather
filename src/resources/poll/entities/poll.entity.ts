import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import {
  PollOption,
  PollOptionSchema,
} from 'src/resources/poll/entities/poll-option.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type PollDocument = HydratedDocument<Poll>;

@Schema({ timestamps: true })
export class Poll extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: [PollOptionSchema],
    required: true,
    validate: [
      (val) => val.length >= 2,
      'Un sondage doit avoir au moins 2 options',
    ],
  })
  options: Types.DocumentArray<PollOption>;

  @Prop({ required: true })
  endDate: Date; // La date et heure de fin du sondage

  @Prop({ required: true, default: false })
  multipleChoice: boolean; // true: l'utilisateur peut choisir plusieurs options, false: une seule option

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  creator: Types.ObjectId | User;

  createdAt: Date;
  updatedAt: Date;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

// Index pour rechercher plus rapidement les sondages actifs
PollSchema.index({ dateFin: 1 });
