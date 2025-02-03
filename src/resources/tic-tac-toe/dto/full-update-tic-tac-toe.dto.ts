import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Validate,
} from 'class-validator';
import { CreateTicTacToeDto } from 'src/resources/tic-tac-toe/dto/create-tic-tac-toe.dto';
import { User } from 'src/resources/user/entities/user.entity';
import { UserExistsValidator } from 'src/validators/user-exists.validator';

export class FullUpdateTicTacToeDto extends PartialType(CreateTicTacToeDto) {
  @IsNotEmpty()
  _id: string;

  @IsOptional()
  @Validate(UserExistsValidator)
  playerX?: User;

  @IsOptional()
  @IsArray()
  grid?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  turn: number = 1;

  @IsOptional()
  @IsBoolean()
  isFinished: boolean = false;
}
