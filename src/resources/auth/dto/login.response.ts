import { Allow } from 'class-validator';
import { PublicUser } from 'src/resources/auth/dto/public-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @Allow()
  @ApiProperty({
    description: "L'utilisateur connecté",
    type: PublicUser,
  })
  user: PublicUser;
  @Allow()
  @ApiProperty({
    description: 'Le token JWT',
    type: String,
  })
  token: string;
  @Allow()
  @ApiProperty({
    description: "Timestamp d'expiration du token",
    type: Number,
  })
  expiresAt: number;
}
