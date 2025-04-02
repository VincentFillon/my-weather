import { Logger, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
export class TicTacToeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger(TicTacToeGateway.name);

  @WebSocketServer()
  server: Server;

  connectedUsers: Map<string, Socket> = new Map<string, Socket>();

  constructor(private readonly ticTacToeService: TicTacToeService) {}

  async handleConnection(socket: Socket) {
    try {
      const user = (socket as any).user;
      if (user && user.sub) {
        this.connectedUsers.set(user.sub, socket);
        this.logger.log(
          `Utilisateur ${user.sub} connecté à la socket ${socket.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error during connection:', error);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    this.connectedUsers.forEach((value, key) => {
      if (value === socket) {
        this.connectedUsers.delete(key);
        this.logger.log(
          `Utilisateur ${key} déconnecté de la socket ${socket.id}`,
        );
      }
    });
  }

  @SubscribeMessage('createTicTacToe')
  @ApiOperation({
    summary: 'Créer une nouvelle partie de morpion',
    description:
      "Permet à un utilisateur de démarrer une nouvelle partie de morpion avec un autre utilisateur ou contre l'ordinateur",
  })
  async create(
    @ConnectedSocket() socket: Socket,
    @MessageBody() createTicTacToeDto: CreateTicTacToeDto,
  ) {
    const ticTacToe = await this.ticTacToeService.create(createTicTacToeDto);

    // Si le joueur n'est pas le joueur X ou O de la partie, on notifie de la création de la partie à tout le monde
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== ticTacToe.playerX._id.toString() &&
      (!ticTacToe.playerO ||
        currentUser.sub !== ticTacToe.playerO._id.toString())
    ) {
      this.server.emit('ticTacToeCreated', ticTacToe);

      return ticTacToe;
    }

    // Sinon on rejoint automatiquement la room de la partie et on notifie les joueurs de la room uniquement

    const ticTacToeId = ticTacToe._id.toString();
    // On rejoint la room
    await socket.join(ticTacToeId);

    // On cherche la socket de l'autre joueur
    let opponentSocket: Socket | undefined = undefined;
    if (ticTacToe.playerX._id.toString() === currentUser.sub) {
      // L'adversaire est O
      if (ticTacToe.playerO) {
        opponentSocket = this.connectedUsers.get(
          ticTacToe.playerO._id.toString(),
        );
      }
    } else if (ticTacToe.playerO._id.toString() === currentUser.sub) {
      // L'adversaire est X
      opponentSocket = this.connectedUsers.get(
        ticTacToe.playerX._id.toString(),
      );
    }

    // On fait rejoindre l'adversaire à la room
    if (opponentSocket) {
      await opponentSocket.join(ticTacToeId);
    }
    // Si on ne trouve pas la socket de l'adversaire, on notifie de la création de la partie à tout le monde
    else {
      this.server.emit('ticTacToeCreated', ticTacToe);
    }

    // On notifie les joueurs de la room de la création de la partie
    this.server.to(ticTacToeId).emit('ticTacToeJoined', ticTacToe);
    this.server.to(ticTacToeId).emit('ticTacToeCreated', ticTacToe);

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
    await socket.join(ticTacToeId);

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
    if (
      !this.server.sockets.adapter.rooms.has(updateTicTacToeDto._id) ||
      !this.server.sockets.adapter.rooms
        .get(updateTicTacToeDto._id)!
        .has(socket.id)
    ) {
      console.debug(this.server.sockets.adapter.rooms);
      console.debug(socket.id);
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
      this.server
        .in(updateTicTacToeDto._id)
        .emit('ticTacToeUpdated', updatedTicTacToe);

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
