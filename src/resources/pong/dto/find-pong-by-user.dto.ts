import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class FindPongByUserDto {
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsBoolean()
  isFinished?: boolean;
}