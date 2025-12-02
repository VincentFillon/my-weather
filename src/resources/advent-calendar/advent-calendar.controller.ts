import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AdventCalendarService } from './advent-calendar.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Advent Calendar')
@Controller('advent-calendar')
@UseGuards(JwtAuthGuard)
export class AdventCalendarController {
  constructor(private readonly adventCalendarService: AdventCalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get calendar status' })
  getCalendar(@Request() req) {
    return this.adventCalendarService.getCalendar(req.user.sub);
  }

  @Post(':day/open')
  @ApiOperation({ summary: 'Open a calendar day' })
  openDay(@Request() req, @Param('day', ParseIntPipe) day: number) {
    return this.adventCalendarService.openDay(req.user.sub, day);
  }
}
