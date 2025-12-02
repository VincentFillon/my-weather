import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { CreateFrameDto } from './create-frame.dto';

export class UpdateFrameDto extends PartialType(CreateFrameDto) {
  @IsMongoId()
  @IsNotEmpty()
  _id: string;
}
