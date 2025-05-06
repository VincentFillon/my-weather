import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';

export class UserVoteDto {
  @IsNotEmpty()
  pollId: string;

  @IsArray()
  @IsOptional()
  selectedOptions?: string[];
}
