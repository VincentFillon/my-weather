import { IsEnum, IsNotEmpty, IsOptional, IsStrongPassword } from 'class-validator';
import { Role } from 'src/resources/auth/enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minUppercase: 1,
    minSymbols: 1,
  })
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.USER;

  @IsOptional()
  @IsNotEmpty()
  image?: string;
}
