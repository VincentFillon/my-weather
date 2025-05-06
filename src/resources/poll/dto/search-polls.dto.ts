import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString
} from 'class-validator';
import { SortOrder } from 'mongoose';

export class SearchPollsDto {
  @IsString()
  @IsOptional()
  pollId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pollIds?: string[];

  @IsString()
  @IsOptional()
  creatorId?: string;

  @IsString()
  @IsOptional()
  term?: string;

  @IsISO8601()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  @IsOptional()
  createdFrom?: Date;

  @IsISO8601()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  @IsOptional()
  createdTo?: Date;

  @IsBoolean()
  @Transform(({ value }) =>
    value != null ? [true, 1, 'true', '1', 0x01].includes(value) : value,
  )
  @IsOptional()
  ended?: boolean;

  @IsISO8601()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  @IsOptional()
  endFrom?: Date;

  @IsISO8601()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  @IsOptional()
  endTo?: Date;

  @IsString()
  @IsOptional()
  sort?: string;

  @IsNotEmpty()
  @IsOptional()
  order?: SortOrder;

  @IsInt()
  @Transform(({ value }) => (value != null ? Number(value) : value))
  @IsOptional()
  limit?: number;

  @IsInt()
  @Transform(({ value }) => (value != null ? Number(value) : value))
  @IsOptional()
  skip?: number;
}
