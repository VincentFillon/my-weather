import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePollDto {
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  options: { text: string }[];

  @IsISO8601()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  endDate: Date; // La date et heure de fin du sondage

  @IsBoolean()
  @Transform(({ value }) => [true, 1, 'true', '1', 0x01].includes(value))
  multipleChoice: boolean; // true: l'utilisateur peut choisir plusieurs options, false: une seule option
}
