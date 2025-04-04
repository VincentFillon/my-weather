import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { CreatePongDto } from 'src/resources/pong/dto/create-pong.dto';
import { UpdatePongDto } from 'src/resources/pong/dto/update-pong.dto';
import { PongPlayerGames } from 'src/resources/pong/entities/pong-player-games.entity';
import {
  PongPlayer,
  PongPlayerDocument,
} from 'src/resources/pong/entities/pong-player.entity';
import { Pong, PongDocument } from 'src/resources/pong/entities/pong.entity';
import {
  ballMaxVelocity,
  ballMinVelocity,
  fieldSize,
  logRandomInt,
} from 'src/resources/pong/pong.utils';

@Injectable()
export class PongService {
  private logger = new Logger(PongService.name);

  constructor(
    @InjectModel(Pong.name) private pongModel: Model<Pong>,
    @InjectModel(PongPlayer.name)
    private pongPlayerModel: Model<PongPlayer>,
    @InjectModel(PongPlayerGames.name)
    private PongPlayerGamesModel: Model<PongPlayerGames>,
  ) {}

  async create(createPongDto: CreatePongDto): Promise<PongDocument> {
    // Ajout de paramètres aléatoires (direction et vitesse initale de la balle)
    const velocity = Math.max(ballMinVelocity, logRandomInt(ballMaxVelocity));
    const vX = Math.random() < 0.5 ? -1 : 1;
    // On calcule l'angle de la balle en privilégiant le centre de la table
    const randomYAngle = Math.max(1, logRandomInt(fieldSize.y / 2));
    let vY = Math.random() < 0.5 ? 1 : -1;
    vY *= 1 + 1 / randomYAngle;

    const pong = new this.pongModel({
      player1: { _id: new Types.ObjectId(createPongDto.player1._id) },
      player2: createPongDto.player2
        ? { _id: new Types.ObjectId(createPongDto.player2._id) }
        : null,
      player1RacketPosition: { x: 0, y: fieldSize.y / 2 },
      player1RacketVelocity: 0,
      player2RacketPosition: { x: fieldSize.x, y: fieldSize.y / 2 },
      player2RacketVelocity: 0,
      ballPosition: { x: fieldSize.x / 2, y: fieldSize.y / 2 },
      ballVx: vX * velocity,
      ballVy: vY * velocity,
      ballVelocity: velocity,
    });
    await pong.save();
    return this.findOne(pong._id.toString());
  }

  findAll(): Promise<PongDocument[]> {
    return this.pongModel.find().populate('player1').populate('player2').exec();
  }

  findOne(id: string): Promise<PongDocument> {
    return this.pongModel
      .findById(id)
      .populate('player1')
      .populate('player2')
      .exec();
  }

  findByUser(userId: string, isFinished?: boolean): Promise<PongDocument[]> {
    const query: RootFilterQuery<Pong> = {
      $or: [
        { player1: { _id: new Types.ObjectId(userId) } },
        { player2: { _id: new Types.ObjectId(userId) } },
      ],
    };
    if (isFinished != null) {
      query.isFinished = isFinished;
    }

    return this.pongModel
      .find(query)
      .populate('player1')
      .populate('player2')
      .exec();
  }

  async leaderboard(): Promise<PongPlayerDocument[]> {
    const leaderboard = await this.pongPlayerModel
      .find()
      .populate('player')
      .populate({
        path: 'wins',
        populate: {
          path: 'games',
          model: 'Pong',
          populate: [
            { path: 'player1', model: 'User' },
            { path: 'player2', model: 'User' },
          ],
        },
      })
      .populate({
        path: 'losses',
        populate: {
          path: 'games',
          model: 'Pong',
          populate: [
            { path: 'player1', model: 'User' },
            { path: 'player2', model: 'User' },
          ],
        },
      })
      .sort({ 'wins.nb': -1, 'losses.nb': 1 })
      .exec();
    // return leaderboard.sort((a, b) => {
    //   if (a.wins.length !== b.wins.length) return b.wins.length - a.wins.length;
    //   return a.losses.length - b.losses.length;
    // });
    return leaderboard;
  }

  async playerUpdate(
    id: string,
    updatePongDto: UpdatePongDto,
  ): Promise<PongDocument> {
    const pong = await this.findOne(id);

    if (!pong) {
      throw new NotFoundException('Partie introuvable');
    }

    // On vérifie que la partie n'est pas déjà terminée
    if (pong.isFinished) {
      throw new BadRequestException('Cette partie est déjà terminée');
    }

    // On vérifie que la partie n'est pas en pause
    if (pong.isPaused) {
      return pong;
    }

    // On met à jour la position de la raquette du joueur
    if (updatePongDto.player === 1) {
      pong.player1RacketPosition = updatePongDto.playerRacketPosition;
      pong.player1RacketVelocity = updatePongDto.playerRacketVelocity;
    } else {
      pong.player2RacketPosition = updatePongDto.playerRacketPosition;
      pong.player2RacketVelocity = updatePongDto.playerRacketVelocity;
    }

    await pong.save();

    return pong;
  }

  async update(id: string, pongUpdates: Partial<Pong>): Promise<PongDocument> {
    const pong = await this.findOne(id);

    if (!pong) {
      throw new NotFoundException('Partie introuvable');
    }

    // On vérifie que la partie n'est pas déjà terminée
    if (pong.isFinished) {
      throw new BadRequestException('Cette partie est déjà terminée');
    }

    // On vérifie que la partie n'est pas en pause
    if (pong.isPaused && pongUpdates.isPaused !== false) {
      return pong;
    }

    if (pongUpdates.isPaused != null) {
      pong.isPaused = pongUpdates.isPaused;
    }
    if (pongUpdates.pausedBy) {
      pong.pausedBy = pongUpdates.pausedBy;
    }
    if (pongUpdates.ballPosition) {
      pong.ballPosition = pongUpdates.ballPosition;
    }
    if (pongUpdates.ballVx) {
      pong.ballVx = pongUpdates.ballVx;
    }
    if (pongUpdates.ballVy) {
      pong.ballVy = pongUpdates.ballVy;
    }
    if (pongUpdates.ballVelocity) {
      pong.ballVelocity = pongUpdates.ballVelocity;
    }
    if (pongUpdates.player2RacketPosition != null) {
      pong.player2RacketPosition = pongUpdates.player2RacketPosition;
    }
    if (pongUpdates.player2RacketVelocity != null) {
      pong.player2RacketVelocity = pongUpdates.player2RacketVelocity;
    }
    if (pongUpdates.winner) {
      pong.winner = pongUpdates.winner;
    }
    if (pongUpdates.isFinished != null) {
      pong.isFinished = pongUpdates.isFinished;
      this.logger.debug(`Partie terminée : mise à jour du leaderboard...`);
      await this.updatePlayerStats(pong);
    }

    await pong.save();

    return pong;
  }

  async updatePlayerStats(pong: PongDocument): Promise<void> {
    this.logger.debug(
      `Recherche du classement du joueur 1 (id: ${pong.player1._id})...`,
    );
    let player1 = await this.pongPlayerModel
      .findOne({
        player: pong.player1._id,
      })
      .populate('player')
      .populate({
        path: 'wins',
        populate: { path: 'games', model: 'Pong' },
      })
      .populate({
        path: 'losses',
        populate: { path: 'games', model: 'Pong' },
      })
      .exec();
    if (!player1) {
      this.logger.debug(
        `Joueur X (id: ${pong.player1._id}) non trouvé : création de son classement...`,
      );
      player1 = new this.pongPlayerModel({
        player: new Types.ObjectId(pong.player1._id),
        wins: new this.PongPlayerGamesModel(),
        losses: new this.PongPlayerGamesModel(),
      });
    }
    let player2: PongPlayerDocument | null = null;
    if (pong.player2) {
      this.logger.debug(
        `Recherche du classement du joueur 2 (id: ${pong.player2?._id})...`,
      );
      player2 = await this.pongPlayerModel
        .findOne({
          player: pong.player2._id,
        })
        .populate('player')
        .populate({
          path: 'wins',
          populate: { path: 'games', model: 'Pong' },
        })
        .populate({
          path: 'losses',
          populate: { path: 'games', model: 'Pong' },
        })
        .exec();

      if (!player2) {
        this.logger.debug(
          `Joueur O (id: ${pong.player2._id}) non trouvé : création de son classement.`,
        );
        player2 = new this.pongPlayerModel({
          player: new Types.ObjectId(pong.player2._id),
          wins: new this.PongPlayerGamesModel(),
          losses: new this.PongPlayerGamesModel(),
        });
      }
    }

    if (pong.winner === 1) {
      this.logger.debug(
        `Ajout de la victoire au classement du joueur 1 (id: ${pong.player1._id}).`,
      );
      player1.wins.nb++;
      player1.wins.games.push(pong);
      if (player2) {
        this.logger.debug(
          `Ajout de la défaite au classement du joueur 2 (id: ${pong.player2._id}).`,
        );
        player2.losses.nb++;
        player2.losses.games.push(pong);
      }
    } else if (pong.winner === 2) {
      this.logger.debug(
        `Ajout de la défaite au classement du joueur 1 (id: ${pong.player1._id}).`,
      );
      player1.losses.nb++;
      player1.losses.games.push(pong);
      if (player2) {
        this.logger.debug(
          `Ajout de la victoire au classement du joueur 2 (id: ${pong.player2._id}).`,
        );
        player2.wins.nb++;
        player2.wins.games.push(pong);
      }
    }

    await player1.save();
    if (player2) {
      await player2.save();
    }
  }

  async remove(id: string): Promise<PongDocument> {
    return this.pongModel
      .findByIdAndDelete(id)
      .populate('player1')
      .populate('player2')
      .exec();
  }
}
