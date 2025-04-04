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
import { Pong, PongDocument } from 'src/resources/pong/entities/pong.entity';
import { ballMaxVelocity, ballMinVelocity, fieldSize, logRandomInt } from 'src/resources/pong/pong.utils';

@Injectable()
export class PongService {
  private logger = new Logger(PongService.name);

  constructor(@InjectModel(Pong.name) private pongModel: Model<Pong>) {}

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

  async leaderboard(): Promise<any[]> {
    // TODO
    return [];
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
    if (
      pong.isPaused &&
      (pongUpdates.isPaused == null || pongUpdates.isPaused === false)
    ) {
      return pong;
    }

    if (pongUpdates.isPaused != null) {
      pong.isPaused = pongUpdates.isPaused;
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
    if (pongUpdates.isFinished) {
      pong.isFinished = pongUpdates.isFinished;
    }

    await pong.save();

    return pong;
  }

  async remove(id: string): Promise<PongDocument> {
    return this.pongModel
      .findByIdAndDelete(id)
      .populate('player1')
      .populate('player2')
      .exec();
  }
}
