import { IsNotEmpty, IsOptional, Validate } from 'class-validator';
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
}
