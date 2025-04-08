import { Logger, UseGuards } from '@nestjs/common';
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
import {
  checkRacketCollision,
  checkScore,
  moveIAPlayer,
  saveInterval,
  updateBallPosition,
} from 'src/resources/pong/pong.utils';

@ApiTags('Pong WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(PongGateway.name);

  @WebSocketServer()
  server: Server;

  connectedUsers: Map<string, Socket> = new Map<string, Socket>();

  currentGames: Map<string, PongDocument> = new Map<string, PongDocument>();
  runningGames: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly pongService: PongService,
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
          this.connectedUsers.set(user.sub, client);
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

  async handleDisconnect(client: Socket) {
    for (const [userId, socket] of this.connectedUsers) {
      if (socket === client) {
        this.connectedUsers.delete(userId);
        this.logger.log(
          `Utilisateur ${userId} déconnecté de la socket ${client.id}`,
        );
        // On stoppe toutes les parties démarrées avec/par cet utilisateur
        const runningGames = await this.pongService.findByUser(userId, false);
        for (const game of runningGames) {
          void this.onPauseGame(
            game._id.toString(),
            game.player1._id.toString() === userId ? 1 : 2,
          );
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
      currentUser &&
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
      // L'adversaire est le joueur 2
      if (pong.player2) {
        opponentSocket = this.connectedUsers.get(pong.player2._id.toString());
      }
    } else if (pong.player2._id.toString() === currentUser.sub) {
      // L'adversaire est le joueur 1
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
  async findByUser(@ConnectedSocket() socket: Socket, @MessageBody() search: FindPongByUserDto) {
    const pongs = await this.pongService.findByUser(
      search.userId,
      search.isFinished,
    );
    socket.join(search.userId);
    this.server.to(search.userId).emit('pongsFound', pongs);
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
      currentUser &&
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      this.logger.warn(
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
      currentUser &&
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      this.logger.warn(
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

    if (pong.isFinished) {
      throw new WsException('Cette partie est déjà terminée');
    }

    if (pong.isPaused) {
      pong.isPaused = false;
      await pong.save();
    }

    this.logger.log(
      `[${pong._id.toString()}] Démarrage de la partie de pong...`,
    );

    // On (re)démarre la partie
    if (this.runningGames.has(pong._id.toString())) {
      const previousRunningGame = this.runningGames.get(pong._id.toString());
      clearInterval(previousRunningGame);
    }
    // Envoi du signal de démarrage avec un compte à rebours de 3 sec
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      this.server.to(pong._id.toString()).emit('pongCountdown', countdown);
      this.logger.log(
        `[${pong._id.toString()}] Compte à rebours : ${countdown}`,
      );
      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);

        let lastUpdate = Date.now();
        let lastSave = Date.now();

        this.server.to(pong._id.toString()).emit('pongStarted', pong);

        const gameLoop = setInterval(() => {
          const now = Date.now();
          const deltaTime = (now - lastUpdate) / 1000;
          lastUpdate = now;

          const updatedPong = this.currentGames.get(pong._id.toString());

          // Mise à jour de la balle
          updateBallPosition(updatedPong, deltaTime, this.logger);

          // Déplacement de l'ordinateur (si pas de joueur 2)
          if (!updatedPong.player2) {
            moveIAPlayer(updatedPong, deltaTime);
          }

          // Vérification des collisions avec les raquettes
          checkRacketCollision(updatedPong, this.logger);

          // Vérification du score (si la balle sort du terrain)
          checkScore(updatedPong);

          this.currentGames.set(pong._id.toString(), updatedPong);

          // Envoi des mises à jour aux joueurs
          this.server.to(pong._id.toString()).emit('pongUpdated', updatedPong);

          if (updatedPong.isFinished) {
            clearInterval(gameLoop);
            this.logger.log(`[${pong._id.toString()}] Partie de pong terminée`);
            this.currentGames.delete(pong._id.toString());
            this.runningGames.delete(pong._id.toString());
            this.server
              .to(updatedPong._id.toString())
              .emit('pongFinished', updatedPong);
          }

          // Mise à jour de la partie
          if (updatedPong.isFinished || now - lastSave >= saveInterval) {
            if (!updatedPong.isFinished) {
              this.logger.log(
                `[${updatedPong._id.toString()}] Balle : { x: ${updatedPong.ballPosition.x}, y: ${updatedPong.ballPosition.y} } Raquette 1 : { x: ${updatedPong.player1RacketPosition.x}, y: ${updatedPong.player1RacketPosition.y} } Raquette 2 : { x: ${updatedPong.player2RacketPosition.x}, y: ${updatedPong.player2RacketPosition.y} }`,
              );
            }
            void this.update(updatedPong);
            lastSave = now;
          }
        }, 1000 / 60); // ~60 FPS

        this.logger.log(`[${pong._id.toString()}] Partie de pong démarrée`);
        this.currentGames.set(pong._id.toString(), pong);
        this.runningGames.set(pong._id.toString(), gameLoop);
      }
    }, 1000);

    return pong;
  }

  private async update(game: PongDocument) {
    await this.pongService.update(game._id.toString(), game);

    if (game.isFinished) {
      const leaderboard = await this.pongService.leaderboard();
      this.server.emit('pongLeaderboardUpdated', leaderboard);
    }
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
      this.logger.debug(this.server.sockets.adapter.rooms);
      this.logger.debug(socket.id);
      throw new WsException('Forbidden');
    }

    const pong = await this.pongService.findOne(updatePongDto._id);

    // On vérifie que le joueur qui veut jouer est bien le joueur 1 ou 2 de la partie
    const currentUser = (socket as any).user;
    if (
      currentUser &&
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      this.logger.warn(
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

      // Mise à jour de la position de la raquette dans la mémoire
      const currentGame = this.currentGames.get(updatePongDto._id);
      if (updatePongDto.player === 1) {
        currentGame.player1RacketPosition = updatedPong.player1RacketPosition;
        currentGame.player1RacketVelocity = updatedPong.player1RacketVelocity;
      } else if (updatePongDto.player === 2) {
        currentGame.player2RacketPosition = updatedPong.player2RacketPosition;
        currentGame.player2RacketVelocity = updatedPong.player2RacketVelocity;
      }

      this.currentGames.set(updatePongDto._id, currentGame);

      this.server.to(updatePongDto._id).emit('pongPlayerUpdated', currentGame);

      return currentGame;
    } catch (error) {
      throw new WsException(error.message);
    }
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
      currentUser &&
      currentUser.sub !== pong.player1._id.toString() &&
      (!pong.player2 || currentUser.sub !== pong.player2._id.toString())
    ) {
      this.logger.warn(
        'Le joueur ' +
          currentUser.sub +
          ' a essayé de mettre en pause le jeu sans être dans la partie',
      );
      throw new WsException('Forbidden');
    }

    const updatedPong = await this.onPauseGame(
      pong._id.toString(),
      pong.player1._id.toString() === currentUser.sub ? 1 : 2,
    );

    return updatedPong;
  }

  private async onPauseGame(
    gameId: string,
    pausedBy?: 1 | 2,
  ): Promise<PongDocument> {
    let currentGame = this.currentGames.get(gameId);
    if (!currentGame) currentGame = await this.pongService.findOne(gameId);

    this.logger.log(`[${gameId}] Pause de la partie de pong`);

    // Suppression de la partie de la mémoire
    this.currentGames.delete(gameId);
    // Arrêt du moteur de jeu
    if (this.runningGames.has(gameId)) {
      const previousRunningGame = this.runningGames.get(gameId);
      clearInterval(previousRunningGame);
      this.runningGames.delete(gameId);
    }
    // Mise à jour de la partie
    if (!currentGame.isPaused) {
      currentGame.isPaused = true;
      currentGame.pausedBy = pausedBy;
      currentGame = await this.pongService.update(gameId, currentGame);
    }

    this.server.to(gameId).emit('pongPaused', currentGame);
    return currentGame;
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
