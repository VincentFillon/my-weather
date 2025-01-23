import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Mood } from 'src/resources/mood/entities/mood.entity';
import { MoodService } from 'src/resources/mood/mood.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class MoodExistsValidator implements ValidatorConstraintInterface {
  constructor(private readonly moodService: MoodService) {}

  async validate(mood: Mood) {
    const existingMood = await this.moodService.findOne(mood._id.toString());
    return !!existingMood;
  }

  defaultMessage() {
    return 'Mood with ID $value does not exist';
  }
}
