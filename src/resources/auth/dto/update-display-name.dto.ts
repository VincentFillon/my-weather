import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDisplayNameDto {
  @IsNotEmpty()
  @IsString()
  displayName: string;
}
