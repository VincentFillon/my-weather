import { IsNotEmpty, IsOptional, IsStrongPassword, Validate } from 'class-validator';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { MoodExistsValidator } from 'src/validators/mood-exists.validator';

export class UpdateUserDto {
  @IsNotEmpty()
  _id: string;

  @IsOptional()
  @IsNotEmpty()
  image?: string;

  @IsOptional()
  @Validate(MoodExistsValidator)
  mood?: Mood;

  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minUppercase: 1,
    minSymbols: 1,
  })
  password?: string;
}
