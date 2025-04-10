import { IsNotEmpty, Validate } from 'class-validator';
import { User } from 'src/resources/user/entities/user.entity';
import { UserExistsValidator } from 'src/validators/user-exists.validator';

export class SendMessageDto {
  @IsNotEmpty()
  room: string;
  @Validate(UserExistsValidator)
  sender: User;
  @IsNotEmpty()
  content: string;
}
