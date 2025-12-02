import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateFrameDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  image: string;
}
