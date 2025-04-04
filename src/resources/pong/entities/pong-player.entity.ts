import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { PongPlayerGames, PongPlayerGamesSchema } from 'src/resources/pong/entities/pong-player-games.entity';
import { User } from 'src/resources/user/entities/user.entity';

export type PongPlayerDocument = HydratedDocument<PongPlayer>;

@Schema({ timestamps: true })
export class PongPlayer {
  _id: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  player: User;

  @Prop({ type: PongPlayerGamesSchema, required: true })
  wins: PongPlayerGames;

  @Prop({ type: PongPlayerGamesSchema, required: true })
  losses: PongPlayerGames;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PongPlayerSchema = SchemaFactory.createForClass(PongPlayer);
