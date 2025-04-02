import { IsOptional, Validate } from 'class-validator';
import { User } from 'src/resources/user/entities/user.entity';
import { UserExistsValidator } from 'src/validators/user-exists.validator';

export class CreatePongDto {
  @Validate(UserExistsValidator)
  player1: User;

  @IsOptional()
  @Validate(UserExistsValidator)
  player2?: User | null = null;
}
