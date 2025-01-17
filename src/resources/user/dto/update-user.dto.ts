import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsOptional, Validate } from 'class-validator';
import { Role } from 'src/resources/auth/enums/role.enum';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { MoodExistsValidator } from 'src/validators/mood-exists.validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty()
  _id: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Validate(MoodExistsValidator)
  mood?: Mood;
}
