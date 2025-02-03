import { IsNotEmpty } from 'class-validator';

export class UpdateTicTacToeDto {
  @IsNotEmpty()
  _id: string;

  @IsNotEmpty()
  player: 'X' | 'O';

  @IsNotEmpty()
  index: number;
}