import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { FindTicTacToeByUserDto } from 'src/resources/tic-tac-toe/dto/find-tic-tac-toe-by-user.dto';
import { UpdateTicTacToeDto } from 'src/resources/tic-tac-toe/dto/update-tic-tac-toe.dto';
import { CreateTicTacToeDto } from './dto/create-tic-tac-toe.dto';
import { TicTacToeService } from './tic-tac-toe.service';

@ApiTags('TicTacToe WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class TicTacToeGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly ticTacToeService: TicTacToeService) {}

  @SubscribeMessage('createTicTacToe')
  @ApiOperation({
    summary: 'Créer une nouvelle partie de morpion',
    description:
      "Permet à un utilisateur de démarrer une nouvelle partie de morpion avec un autre utilisateur ou contre l'ordinateur",
  })
  async create(@MessageBody() createTicTacToeDto: CreateTicTacToeDto) {
    const ticTacToe = await this.ticTacToeService.create(createTicTacToeDto);
    this.server.emit('ticTacToeCreated', ticTacToe);
    return ticTacToe;
  }

  @SubscribeMessage('joinTicTacToe')
  async joinGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() ticTacToeId: string,
  ) {
    const ticTacToe = await this.ticTacToeService.findOne(ticTacToeId);
    if (!ticTacToe) {
      throw new WsException('Partie introuvable');
    }
    // On vérifie que le joueur qui veut jouer est bien le joueur X ou O de la partie
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== ticTacToe.playerX._id.toString() &&
      (!ticTacToe.playerO ||
        currentUser.sub !== ticTacToe.playerO._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de jouer sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    // On rejoint la room
    socket.join(ticTacToeId);
    this.server.to(ticTacToeId).emit('ticTacToeJoined', ticTacToe);

    return ticTacToe;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('findAllTicTacToe')
  @ApiOperation({
    summary: 'Récupérer toutes les parties de morpion',
    description: 'Retourne la liste de toutes les parties de morpion',
  })
  async findAll() {
    const ticTacToes = await this.ticTacToeService.findAll();
    this.server.emit('ticTacToesFound', ticTacToes);
    return ticTacToes;
  }

  @SubscribeMessage('findOneTicTacToe')
  @ApiOperation({
    summary: 'Récupérer une partie de morpion spécifique',
    description: 'Retourne une partie de morpion à partir de son ID',
  })
  async findOne(@MessageBody() id: string) {
    const ticTacToe = await this.ticTacToeService.findOne(id);
    this.server.emit('ticTacToeFound', ticTacToe);
    return ticTacToe;
  }

  @SubscribeMessage('findTicTacToeByUser')
  @ApiOperation({
    summary: "Récupérer les partie de morpions d'un utilisateur",
    description:
      "Retourne les parties de morpion d'un utilisateur à partir de son ID. Peut être filtré par partie terminée ou non",
  })
  async findByUser(@MessageBody() search: FindTicTacToeByUserDto) {
    const ticTacToes = await this.ticTacToeService.findByUser(
      search.userId,
      search.isFinished,
    );
    this.server.emit('ticTacToesFound', ticTacToes);
    return ticTacToes;
  }

  @SubscribeMessage('ticTacToeLeaderboard')
  @ApiOperation({
    summary: 'Récupérer le classement des joueurs de morpion',
    description:
      'Retourne le classement des joueurs de morpion par nombre de victoires',
  })
  async leaderboard() {
    const leaderboard = await this.ticTacToeService.leaderboard();
    this.server.emit('ticTacToeLeaderboardUpdated', leaderboard);
    return leaderboard;
  }

  @SubscribeMessage('updateTicTacToe')
  @ApiOperation({
    summary: 'Mettre à jour une partie de morpion',
    description:
      'Permet à un joueur de mettre à jour une partie de morpion par son ID',
  })
  async update(
    @ConnectedSocket() socket: Socket,
    @MessageBody() updateTicTacToeDto: UpdateTicTacToeDto,
  ) {
    // On vérifie que le joueur passe bien par la room de la partie pour jouer
    if (!this.server.sockets.adapter.rooms[updateTicTacToeDto._id] || !this.server.sockets.adapter.rooms[updateTicTacToeDto._id].sockets[socket.id]) {
      throw new WsException('Forbidden');
    }

    const ticTacToe = await this.findOne(updateTicTacToeDto._id);

    // On vérifie que le joueur qui veut jouer est bien le joueur X ou O de la partie
    // TODO: ce test n'est plus utilise suite à la mise en place des rooms. Le retirer ?
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== ticTacToe.playerX._id.toString() &&
      (!ticTacToe.playerO ||
        currentUser.sub !== ticTacToe.playerO._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de jouer sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    try {
      const updatedTicTacToe = await this.ticTacToeService.update(
        updateTicTacToeDto._id,
        updateTicTacToeDto,
        currentUser.sub,
      );
      this.server.emit('ticTacToeUpdated', updatedTicTacToe);

      if (updatedTicTacToe.isFinished) {
        const leaderboard = await this.ticTacToeService.leaderboard();
        this.server.emit('ticTacToeLeaderboardUpdated', leaderboard);
      }

      return updatedTicTacToe;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('removeTicTacToe')
  @ApiOperation({
    summary: 'Supprimer une partie de morpion',
    description: 'Permet à un joueur de supprimer une partie par son ID',
  })
  async remove(@MessageBody() id: string) {
    const deletedTicTacToe = await this.ticTacToeService.remove(id);
    this.server.emit('ticTacToeRemoved', id);
    return deletedTicTacToe;
  }
}
