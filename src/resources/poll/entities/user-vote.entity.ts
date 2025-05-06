import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { Poll } from 'src/resources/poll/entities/poll.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type UserVoteDocument = HydratedDocument<UserVote>;

@Schema({ timestamps: true })
export class UserVote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true, index: true })
  poll: Types.ObjectId | Poll; // Référence au sondage concerné

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId | User; // Référence à l'utilisateur qui a voté

  @Prop({
    type: [Types.ObjectId],
  })
  selectedOptions: Types.ObjectId[]; // Tableau des _id des options choisies par l'utilisateur.
  // Important: ces IDs sont ceux des sous-documents OptionSondage dans le document Sondage correspondant.

  createdAt: Date;
  updatedAt: Date;
}

export const UserVoteSchema = SchemaFactory.createForClass(UserVote);

// --- Index Unique Composé ---
// Garantit qu'un utilisateur ne peut voter qu'une seule fois pour un sondage donné.
UserVoteSchema.index({ poll: 1, user: 1 }, { unique: true });
