import { Transform } from 'class-transformer';
import { IsDate, IsNotEmpty } from 'class-validator';

export class PublicHoliday {
  @IsDate()
  @Transform(({ value }) => (value != null ? new Date(value) : value))
  date: Date;
  @IsNotEmpty()
  name: string;
}
