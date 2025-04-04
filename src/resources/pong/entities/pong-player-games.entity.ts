import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Pong } from 'src/resources/pong/entities/pong.entity';

export type PongPlayerGamesDocument = HydratedDocument<PongPlayerGames>;

@Schema({ _id: false, versionKey: false })
export class PongPlayerGames {
  @Prop({ type: Number, required: true, default: 0 })
  nb: number = 0;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pong' }],
    required: true,
    default: [],
  })
  games: Pong[] = [];
}

export const PongPlayerGamesSchema =
  SchemaFactory.createForClass(PongPlayerGames);
