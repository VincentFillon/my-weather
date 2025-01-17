import { UseGuards } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';
import { MoodService } from './mood.service';

@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class MoodGateway {
  constructor(private readonly moodService: MoodService) {}

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('createMood')
  create(@MessageBody() createMoodDto: CreateMoodDto) {
    return this.moodService.create(createMoodDto);
  }

  @SubscribeMessage('findAllMood')
  findAll() {
    return this.moodService.findAll();
  }

  @SubscribeMessage('findOneMood')
  findOne(@MessageBody() id: string) {
    return this.moodService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('updateMood')
  update(@MessageBody() updateMoodDto: UpdateMoodDto) {
    return this.moodService.update(updateMoodDto._id, updateMoodDto);
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('removeMood')
  remove(@MessageBody() id: string) {
    return this.moodService.remove(id);
  }
}
