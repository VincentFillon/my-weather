import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateMoodDto {
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsNotEmpty()
  image: string;

  sound?: string;
}
