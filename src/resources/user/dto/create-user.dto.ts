import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { Role } from 'src/resources/auth/enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.USER;

  @IsOptional()
  @IsNotEmpty()
  image?: string;
}
