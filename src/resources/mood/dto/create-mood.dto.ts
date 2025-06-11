import { Allow, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateMoodDto {
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsNotEmpty()
  image: string;

  @IsOptional()
  @IsNotEmpty()
  color?: string;

  @Allow()
  sound?: string;
}
