import { Allow } from 'class-validator';
import { PublicUser } from 'src/resources/auth/dto/public-user.dto';

export class LoginResponse {
  @Allow()
  user: PublicUser;
  @Allow()
  token: string;
}
