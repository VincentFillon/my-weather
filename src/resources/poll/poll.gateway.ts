import {
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { SearchPollsDto } from 'src/resources/poll/dto/search-polls.dto';
import { UserVoteDto } from 'src/resources/poll/dto/user-vote.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { PollService } from './poll.service';

@ApiTags('Poll WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class PollGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PollGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly pollService: PollService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.headers?.authorization;
      if (token) {
        const user = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        if (user && user.sub) {
          // Joindre la room personnelle de l'utilisateur
          client.join(`user_${user.sub}`);
          this.logger.log(
            `Utilisateur ${user.sub} connecté à la socket ${client.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error during connection:', error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    const userId = user ? user.sub : 'inconnu';
    console.log(`[Chat WS] Client déconnecté: ${client.id} (User: ${userId})`);
    // Socket.IO gère automatiquement le 'leave' des rooms lors de la déconnexion
  }

  @SubscribeMessage('createPoll')
  @ApiOperation({
    summary: 'Créer un nouveau sondage',
    description:
      'Permet à un administrateur de créer un nouveau sondage avec un titre, une image et optionnellement un son',
  })
  async create(
    @MessageBody() createPollDto: CreatePollDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) throw new UnauthorizedException();

    const poll = await this.pollService.create(createPollDto, currentUser.sub);
    this.server.emit('pollCreated', poll);
    return poll;
  }

  @SubscribeMessage('findAllPoll')
  @ApiOperation({
    summary: 'Récupérer toutes les sondages',
    description: 'Retourne la liste de toutes les sondages disponibles',
  })
  async findAll(@ConnectedSocket() client: Socket) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    const polls = await this.pollService.findAll();
    this.server.to(`user_${currentUser.sub}`).emit('pollsFound', polls);
    return polls;
  }

  @SubscribeMessage('searchPolls')
  @ApiOperation({
    summary: 'Rechercher des sondages',
    description:
      'Retourne la liste des sondages correspondant aux filtres donnés',
  })
  async search(
    @MessageBody() filters: SearchPollsDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const polls = await this.pollService.search(filters);
    this.server.to(`user_${currentUser.sub}`).emit('pollsSearchFound', polls);
    return polls;
  }

  @SubscribeMessage('findOnePoll')
  @ApiOperation({
    summary: 'Récupérer un sondage spécifique',
    description: "Retourne les détails d'un sondage à partir de son ID",
  })
  async findOne(@MessageBody() id: string, @ConnectedSocket() client: Socket) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const poll = await this.pollService.findOne(id);
    this.server.to(`user_${currentUser.sub}`).emit('pollFound', poll);
    return poll;
  }

  @SubscribeMessage('updatePoll')
  @ApiOperation({
    summary: 'Mettre à jour un sondage',
    description: 'Permet de modifier un sondage existant',
  })
  async update(
    @MessageBody() updatePollDto: UpdatePollDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) throw new UnauthorizedException();

    const poll = await this.pollService.findOne(updatePollDto._id);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.creator._id.toString() !== currentUser.sub) {
      throw new ForbiddenException('You are not the creator of this poll');
    }

    const updatedPoll = await this.pollService.update(
      updatePollDto._id,
      updatePollDto,
    );
    this.server.emit('pollUpdated', updatedPoll);
    return updatedPoll;
  }

  @SubscribeMessage('findPollVotes')
  @ApiOperation({
    summary: "Récupérer les votes d'un sondage",
    description: "Retourne la liste des votes d'un sondage spécifique",
  })
  async findPollVotes(
    @MessageBody() pollId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const userVotes = await this.pollService.findVotesByPollId(pollId);
    this.server
      .to(`user_${currentUser.sub}`)
      .emit('pollVotes', { pollId, userVotes });
    return userVotes;
  }

  @SubscribeMessage('userVote')
  @ApiOperation({
    summary: 'Voter dans un sondage',
    description: 'Permet de voter dans un sondage existant',
  })
  async vote(
    @MessageBody() userVoteDto: UserVoteDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) throw new UnauthorizedException();

    const userVote = await this.pollService.vote(currentUser.sub, userVoteDto);
    this.server.emit('userVoted', { pollId: userVoteDto.pollId, userVote });
    return userVote;
  }

  @SubscribeMessage('removePoll')
  @ApiOperation({
    summary: 'Supprimer un sondage',
    description: 'Permet de supprimer un sondage existante',
  })
  async remove(@MessageBody() id: string) {
    const deletedPoll = await this.pollService.delete(id);
    this.server.emit('pollRemoved', id);
    return deletedPoll;
  }
}
