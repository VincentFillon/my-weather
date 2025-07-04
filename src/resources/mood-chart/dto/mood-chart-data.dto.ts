import { ApiProperty } from '@nestjs/swagger';

export class MoodChartDataDto {
  @ApiProperty({ description: 'La date du point de données.' })
  date: string;

  @ApiProperty({ description: "L'ordre de l'humeur de l'utilisateur pour cette date." })
  userMoodOrder: number;

  @ApiProperty({ description: "L'ordre de l'humeur médiane pour cette date." })
  medianMoodOrder: number;
}