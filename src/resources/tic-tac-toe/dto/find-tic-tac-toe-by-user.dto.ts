import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class FindTicTacToeByUserDto {
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsBoolean()
  isFinished?: boolean;
}