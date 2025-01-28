import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class UserHistoryFilters {
  @IsOptional()
  userId?: string | null;

  @IsOptional()
  moodId?: string | null;

  @IsOptional()
  updatedById?: string | null;

  @IsOptional()
  @IsDate()
  from?: Date | null;

  @IsOptional()
  @IsDate()
  to?: Date | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number | null;
}
