import { OmitType } from '@nestjs/mapped-types';
import { User } from 'src/resources/user/entities/user.entity';

export class PublicUser extends OmitType(User, ['password']) {}
