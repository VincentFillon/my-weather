import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty } from 'class-validator';
import { CreateMoodDto } from './create-mood.dto';

export class UpdateMoodDto extends PartialType(CreateMoodDto) {
  @IsNotEmpty()
  _id: string;
}
