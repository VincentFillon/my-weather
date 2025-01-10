import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';
import { MoodService } from './mood.service';

@WebSocketGateway()
export class MoodGateway {
  constructor(private readonly moodService: MoodService) {}

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

  @SubscribeMessage('updateMood')
  update(@MessageBody() updateMoodDto: UpdateMoodDto) {
    return this.moodService.update(updateMoodDto._id, updateMoodDto);
  }

  @SubscribeMessage('removeMood')
  remove(@MessageBody() id: string) {
    return this.moodService.remove(id);
  }
}
