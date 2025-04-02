import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject
} from 'class-validator';
import { Position } from 'src/resources/pong/entities/pong.entity';

export class UpdatePongDto {
  @IsNotEmpty()
  _id: string;

  @IsNotEmpty()
  player: 1 | 2;

  @IsObject()
  playerRacketPosition: Position;

  @IsNumber()
  @Transform(({ value }) => (value != null ? +value : value))
  playerRacketVelocity: number;
}
