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
import { CreatePongDto } from 'src/resources/pong/dto/create-pong.dto';
import { FindPongByUserDto } from 'src/resources/pong/dto/find-pong-by-user.dto';
import { UpdatePongDto } from 'src/resources/pong/dto/update-pong.dto';
import { PongDocument } from 'src/resources/pong/entities/pong.entity';
import { PongService } from 'src/resources/pong/pong.service';
import { startGameLoop } from 'src/resources/pong/pong.utils';

@ApiTags('Pong WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(PongGateway.name);

  @WebSocketServer()
  server: Server;

  connectedUsers: Map<string, Socket> = new Map<string, Socket>();

  runningGames: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  constructor(private readonly pongService: PongService) {}

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
    for (const [userId, socket] of this.connectedUsers) {
      if (socket === socket) {
        this.connectedUsers.delete(userId);
        this.logger.log(
          `Utilisateur ${userId} déconnecté de la socket ${socket.id}`,
        );
        // On stoppe toutes les parties démarrées avec/par cet utilisateur
        const runningGames = await this.pongService.findByUser(userId, false);
        for (const game of runningGames) {
        }
      }
    }
  }

  @SubscribeMessage('createPong')
  @ApiOperation({
    summary: 'Créer une nouvelle partie de pong',
    description:
      "Permet à un utilisateur de démarrer une nouvelle partie de pong avec un autre utilisateur ou contre l'ordinateur",
  })
  async create(
    @ConnectedSocket() socket: Socket,
    @MessageBody() createPongDto: CreatePongDto,
  ) {
    const pong = await this.pongService.create(createPongDto);

    // Si le joueur n'est pas le joueur 1 ou 2 de la partie, on notifie de la création de la partie à tout le monde
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      this.server.emit('pongCreated', pong);

      return pong;
    }

    // Sinon on rejoint automatiquement la room de la partie et on notifie les joueurs de la room uniquement

    const pongId = pong._id.toString();
    // On rejoint la room
    await socket.join(pongId);

    // On cherche la socket de l'autre joueur
    let opponentSocket: Socket | undefined = undefined;
    if (pong.player1._id.toString() === currentUser.sub) {
      // L'adversaire est O
      if (pong.player2) {
        opponentSocket = this.connectedUsers.get(pong.player2._id.toString());
      }
    } else if (pong.player2._id.toString() === currentUser.sub) {
      // L'adversaire est X
      opponentSocket = this.connectedUsers.get(pong.player1._id.toString());
    }

    // On fait rejoindre l'adversaire à la room
    if (opponentSocket) {
      await opponentSocket.join(pongId);
    }
    // Si on ne trouve pas la socket de l'adversaire, on notifie de la création de la partie à tout le monde
    else {
      this.server.emit('pongCreated', pong);
    }

    // On notifie les joueurs de la room de la création de la partie
    this.server.to(pongId).emit('pongCreated', pong);
    this.server.to(pongId).emit('pongJoined', pong);

    return pong;
  }

  @SubscribeMessage('joinPong')
  @ApiOperation({
    summary: 'Rejoindre une partie de pong',
    description: 'Rejoindre une partie de pong',
  })
  async joinGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() pongId: string,
  ) {
    const pong = await this.pongService.findOne(pongId);
    if (!pong) {
      throw new WsException('Partie introuvable');
    }
    // On vérifie que le joueur qui veut jouer est bien le joueur 1 ou 2 de la partie
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de jouer sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    // On rejoint la room
    await socket.join(pongId);

    this.server.to(pongId).emit('pongJoined', pong);

    return pong;
  }

  @SubscribeMessage('pausePong')
  @ApiOperation({
    summary: 'Mettre en pause une partie de pong',
    description: 'Mettre en pause une partie de pong',
  })
  async pauseGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() pongId: string,
  ) {
    const pong = await this.pongService.findOne(pongId);
    if (!pong) {
      throw new WsException('Partie introuvable');
    }
    // On vérifie que le joueur qui veut mettre la partie en pause est bien le joueur 1 ou 2 de la partie
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de mettre en pause le jeu sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    this.onPauseGame(pong);

    return pong;
  }

  private async onPauseGame(game: PongDocument) {
    if (this.runningGames.has(game._id.toString())) {
      const previousRunningGame = this.runningGames.get(game._id.toString());
      clearInterval(previousRunningGame);
      this.runningGames.delete(game._id.toString());
    }
    if (!game.isPaused) {
      this.pongService.update(game._id.toString(), { isPaused: true });
    }

    this.server.to(game._id.toString()).emit('pongPaused', game);
  }

  @SubscribeMessage('startPong')
  @ApiOperation({
    summary: '(Re)démarrer une partie de pong',
    description: 'Démarrer (ou reprendre après une pause) une partie de pong',
  })
  async startGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() gameId: string,
  ) {
    const pong = await this.pongService.findOne(gameId);
    if (!pong) {
      throw new WsException('Partie introuvable');
    }
    // On vérifie que le joueur qui veut jouer est bien le joueur 1 ou 2 de la partie
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de jouer sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    // On vérifie que les 2 joueurs sont connectés à la socket avant de (re)démarrer la partie
    const player1Socket = this.connectedUsers.get(pong.player1._id.toString());
    const player2Socket = pong.player2
      ? this.connectedUsers.get(pong.player2._id.toString())
      : null;
    if (!player1Socket || (pong.player2 && !player2Socket)) {
      throw new WsException('Les 2 joueurs doivent rejoindre la partie');
    }

    // On (re)démarre la partie
    if (this.runningGames.has(pong._id.toString())) {
      const previousRunningGame = this.runningGames.get(pong._id.toString());
      clearInterval(previousRunningGame);
    }
    this.runningGames.set(
      pong._id.toString(),
      startGameLoop(this.server, pong),
    );

    return pong;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('findAllPong')
  @ApiOperation({
    summary: 'Récupérer toutes les parties de pong',
    description: 'Retourne la liste de toutes les parties de pong',
  })
  async findAll() {
    const pongs = await this.pongService.findAll();
    this.server.emit('pongsFound', pongs);
    return pongs;
  }

  @SubscribeMessage('findOnePong')
  @ApiOperation({
    summary: 'Récupérer une partie de pong spécifique',
    description: 'Retourne une partie de pong à partir de son ID',
  })
  async findOne(@MessageBody() id: string) {
    const pong = await this.pongService.findOne(id);
    this.server.emit('pongFound', pong);
    return pong;
  }

  @SubscribeMessage('findPongByUser')
  @ApiOperation({
    summary: "Récupérer les partie de pongs d'un utilisateur",
    description:
      "Retourne les parties de pong d'un utilisateur à partir de son ID. Peut être filtré par partie terminée ou non",
  })
  async findByUser(@MessageBody() search: FindPongByUserDto) {
    const pongs = await this.pongService.findByUser(
      search.userId,
      search.isFinished,
    );
    this.server.emit('pongsFound', pongs);
    return pongs;
  }

  @SubscribeMessage('pongLeaderboard')
  @ApiOperation({
    summary: 'Récupérer le classement des joueurs de pong',
    description:
      'Retourne le classement des joueurs de pong par nombre de victoires',
  })
  async leaderboard() {
    const leaderboard = await this.pongService.leaderboard();
    this.server.emit('pongLeaderboardUpdated', leaderboard);
    return leaderboard;
  }

  @SubscribeMessage('updatePong')
  @ApiOperation({
    summary: 'Mettre à jour une partie de pong',
    description:
      'Permet à un joueur de mettre à jour une partie de pong par son ID',
  })
  async updatePlayer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() updatePongDto: UpdatePongDto,
  ) {
    // On vérifie que le joueur passe bien par la room de la partie pour jouer
    if (
      !this.server.sockets.adapter.rooms.has(updatePongDto._id) ||
      !this.server.sockets.adapter.rooms.get(updatePongDto._id)!.has(socket.id)
    ) {
      console.debug(this.server.sockets.adapter.rooms);
      console.debug(socket.id);
      throw new WsException('Forbidden');
    }

    const pong = await this.findOne(updatePongDto._id);

    // On vérifie que le joueur qui veut jouer est bien le joueur 1 ou 2 de la partie
    // TODO: ce test n'est plus utile suite à la mise en place des rooms. Le retirer ?
    const currentUser = (socket as any).user;
    if (
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      console.log(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de jouer sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    try {
      const updatedPong = await this.pongService.playerUpdate(
        updatePongDto._id,
        updatePongDto,
      );
      this.server.in(updatePongDto._id).emit('pongPlayerUpdated', updatedPong);

      return updatedPong;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('removePong')
  @ApiOperation({
    summary: 'Supprimer une partie de pong',
    description: 'Permet à un joueur de supprimer une partie par son ID',
  })
  async remove(@MessageBody() id: string) {
    const deletedPong = await this.pongService.remove(id);
    this.server.emit('pongRemoved', id);
    return deletedPong;
  }
}
