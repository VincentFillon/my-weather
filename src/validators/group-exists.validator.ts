import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { GroupService } from 'src/resources/group/group.service';
import { Mood } from 'src/resources/mood/entities/mood.entity';

@ValidatorConstraint({ async: true })
@Injectable()
export class GroupExistsValidator implements ValidatorConstraintInterface {
  constructor(private readonly moodService: GroupService) {}

  async validate(mood: Mood) {
    const existingMood = await this.moodService.findById(mood._id.toString());
    return !!existingMood;
  }

  defaultMessage() {
    return 'Mood with ID $value does not exist';
  }
}
