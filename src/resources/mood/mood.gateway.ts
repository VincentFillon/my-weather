import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';
import { MoodService } from './mood.service';

@ApiTags('Mood WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class MoodGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly moodService: MoodService) {}

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('createMood')
  @ApiOperation({
    summary: 'Créer une nouvelle humeur',
    description:
      'Permet à un administrateur de créer une nouvelle humeur avec un titre, une image et optionnellement un son',
  })
  async create(@MessageBody() createMoodDto: CreateMoodDto) {
    const mood = await this.moodService.create(createMoodDto);
    this.server.emit('moodCreated', mood);
    return mood;
  }

  @SubscribeMessage('findAllMood')
  @ApiOperation({
    summary: 'Récupérer toutes les humeurs',
    description: 'Retourne la liste de toutes les humeurs disponibles',
  })
  async findAll() {
    const moods = await this.moodService.findAll();
    this.server.emit('moodsFound', moods);
    return moods;
  }

  @SubscribeMessage('findOneMood')
  @ApiOperation({
    summary: 'Récupérer une humeur spécifique',
    description: "Retourne les détails d'une humeur à partir de son ID",
  })
  async findOne(@MessageBody() id: string) {
    const mood = await this.moodService.findOne(id);
    this.server.emit('moodFound', mood);
    return mood;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('updateMood')
  @ApiOperation({
    summary: 'Mettre à jour une humeur',
    description: 'Permet à un administrateur de modifier une humeur existante',
  })
  async update(@MessageBody() updateMoodDto: UpdateMoodDto) {
    const updatedMood = await this.moodService.update(
      updateMoodDto._id,
      updateMoodDto,
    );
    this.server.emit('moodUpdated', updatedMood);
    return updatedMood;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('removeMood')
  @ApiOperation({
    summary: 'Supprimer une humeur',
    description: 'Permet à un administrateur de supprimer une humeur existante',
  })
  async remove(@MessageBody() id: string) {
    const deletedMood = await this.moodService.remove(id);
    this.server.emit('moodRemoved', id);
    return deletedMood;
  }
}
