import { IsOptional, Validate } from 'class-validator';
import { User } from 'src/resources/user/entities/user.entity';
import { UserExistsValidator } from 'src/validators/user-exists.validator';

export class CreateTicTacToeDto {
  @Validate(UserExistsValidator)
  playerX: User;

  @IsOptional()
  @Validate(UserExistsValidator)
  playerO?: User | null = null;
}
