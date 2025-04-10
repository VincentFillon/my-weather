import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type ReadStatusDocument = HydratedDocument<ReadStatus>;

@Schema({ timestamps: true }) // Timestamps createdAt/updatedAt peuvent être utiles
export class ReadStatus {
  _id: Types.ObjectId;

  // Clé composite (userId, roomId) pour identifier l'état de lecture
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Utiliser Types.ObjectId pour les références Mongoose

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  // Le timestamp du DERNIER message lu par cet utilisateur dans cette room
  @Prop({ required: true })
  lastReadTimestamp: Date;

  // Optionnel: Ajoutés automatiquement par { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const ReadStatusSchema = SchemaFactory.createForClass(ReadStatus);

// Index pour accélérer les recherches par utilisateur et room
ReadStatusSchema.index({ userId: 1, roomId: 1 }, { unique: true });
// Index pour trouver rapidement les statuts d'un utilisateur
ReadStatusSchema.index({ userId: 1 });
