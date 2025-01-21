import { IsNotEmpty, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minUppercase: 1,
    minSymbols: 1,
  })
  newPassword: string;
}
