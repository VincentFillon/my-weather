import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { PublicHolidaysController } from './public-holidays.controller';

@Module({
  imports: [HttpModule, CacheModule.register()],
  controllers: [PublicHolidaysController],
  providers: [],
  exports: [],
})
export class PublicHolidaysModule {}
