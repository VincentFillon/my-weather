import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { GetUser } from 'src/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';
import { MoodService } from './mood.service';

@Controller('moods')
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Post()
  create(@Body() createMoodDto: CreateMoodDto) {
    return this.moodService.create(createMoodDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.moodService.findAll(user.activeGroup.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moodService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMoodDto: UpdateMoodDto) {
    return this.moodService.update(id, updateMoodDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.moodService.remove(id);
  }
}