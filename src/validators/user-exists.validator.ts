import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { User } from 'src/resources/user/entities/user.entity';
import { UserService } from 'src/resources/user/user.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class UserExistsValidator implements ValidatorConstraintInterface {
  constructor(private readonly userService: UserService) {}

  async validate(user: User) {
    const existingUser = await this.userService.findOne(user._id.toString());
    return !!existingUser;
  }

  defaultMessage() {
    return 'User with ID $value does not exist';
  }
}
