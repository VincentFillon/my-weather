import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { User } from 'src/resources/user/entities/user.entity';
import { UserExistsValidator } from 'src/validators/user-exists.validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  room: string;

  @Validate(UserExistsValidator)
  sender: User;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
