import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PublicHolidaysController } from './public-holidays.controller';

@Module({
  imports: [HttpModule],
  controllers: [PublicHolidaysController],
  providers: [],
  exports: [],
})
export class PublicHolidaysModule {}
