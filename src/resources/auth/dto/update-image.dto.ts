import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateImageDto {
  @IsNotEmpty()
  @IsString()
  image: string;
}
