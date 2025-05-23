import { PartialType } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';
import { CreatePollDto } from 'src/resources/poll/dto/create-poll.dto';

export class UpdatePollDto extends PartialType(CreatePollDto) {
  @IsNotEmpty()
  _id: string;


  @IsArray()
  options: { _id?: string; text: string }[];
}
