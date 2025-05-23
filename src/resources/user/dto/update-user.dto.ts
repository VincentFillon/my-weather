import { IsNotEmpty, IsOptional, Validate } from 'class-validator';
import { Group } from 'src/resources/group/entities/group.entity';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { GroupExistsValidator } from 'src/validators/group-exists.validator';
import { MoodExistsValidator } from 'src/validators/mood-exists.validator';

export class UpdateUserDto {
  @IsNotEmpty()
  _id: string;

  @IsOptional()
  @IsNotEmpty()
  image?: string;

  @IsOptional()
  @Validate(GroupExistsValidator)
  group?: Group;

  @IsOptional()
  @Validate(MoodExistsValidator)
  mood?: Mood;

  @IsNotEmpty()
  password?: string;
}
