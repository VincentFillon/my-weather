import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MediaType } from '../enums/media-type.enum';

export type MediaDocument = HydratedDocument<Media>;

@Schema({ timestamps: true })
export class Media {
    _id: Types.ObjectId;

    @Prop({ required: true, unique: true })
    filename: string;

    @Prop({ required: true, enum: MediaType })
    type: MediaType;

    @Prop()
    createdAt?: Date;

    @Prop()
    updateddAt?: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
