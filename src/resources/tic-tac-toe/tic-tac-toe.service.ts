import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { TicTacToePlayerGames } from 'src/resources/tic-tac-toe/entities/tic-tac-toe-player-games.entity';
import {
  TicTacToePlayer,
  TicTacToePlayerDocument,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe-player.entity';
import {
  TicTacToe,
  TicTacToeDocument,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';
import {
  computerMoveMinMax,
  isFinished,
} from 'src/resources/tic-tac-toe/tic-tac-toe.utils';
import { User } from 'src/resources/user/entities/user.entity';
import { CreateTicTacToeDto } from './dto/create-tic-tac-toe.dto';
import { UpdateTicTacToeDto } from './dto/update-tic-tac-toe.dto';

@Injectable()
export class TicTacToeService {
  private logger = new Logger(TicTacToeService.name);

  constructor(
    @InjectModel(TicTacToe.name) private ticTacToeModel: Model<TicTacToe>,
    @InjectModel(TicTacToePlayer.name)
    private ticTacToePlayerModel: Model<TicTacToePlayer>,
    @InjectModel(TicTacToePlayerGames.name)
    private TicTacToePlayerGamesModel: Model<TicTacToePlayerGames>,
  ) {}

  async create(
    createTicTacToeDto: CreateTicTacToeDto,
  ): Promise<TicTacToeDocument> {
    const ticTacToe = new this.ticTacToeModel({
      playerX: { _id: new Types.ObjectId(createTicTacToeDto.playerX._id) },
      playerO: createTicTacToeDto.playerO
        ? { _id: new Types.ObjectId(createTicTacToeDto.playerO._id) }
        : null,
      firstPlayer: Math.random() < 0.5 ? 'X' : 'O',
    });
    // Si le premier joueur à jouer est l'ordinateur : on fait son coup directement
    if (ticTacToe.firstPlayer === 'O' && !ticTacToe.playerO) {
      computerMoveMinMax(ticTacToe);
    }
    await ticTacToe.save();
    return this.findOne(ticTacToe._id.toString());
  }

  findAll(): Promise<TicTacToeDocument[]> {
    return this.ticTacToeModel
      .find()
      .populate('playerX')
      .populate('playerO')
      .exec();
  }

  findOne(id: string): Promise<TicTacToeDocument> {
    return this.ticTacToeModel
      .findById(id)
      .populate('playerX')
      .populate('playerO')
      .exec();
  }

  findByUser(
    userId: string,
    isFinished?: boolean,
  ): Promise<TicTacToeDocument[]> {
    const query: RootFilterQuery<TicTacToe> = {
      $or: [
        { playerX: { _id: new Types.ObjectId(userId) } },
        { playerO: { _id: new Types.ObjectId(userId) } },
      ],
    };
    if (isFinished != null) {
      query.isFinished = isFinished;
    }

    return this.ticTacToeModel
      .find(query)
      .populate('playerX')
      .populate('playerO')
      .exec();
  }

  async leaderboard(): Promise<TicTacToePlayerDocument[]> {
    const leaderboard = await this.ticTacToePlayerModel
      .find()
      .populate('player')
      .populate({
        path: 'wins',
        populate: {
          path: 'games',
          model: 'TicTacToe',
          populate: [
            { path: 'playerX', model: 'User' },
            { path: 'playerO', model: 'User' },
          ],
        },
      })
      .populate({
        path: 'draws',
        populate: {
          path: 'games',
          model: 'TicTacToe',
          populate: [
            { path: 'playerX', model: 'User' },
            { path: 'playerO', model: 'User' },
          ],
        },
      })
      .populate({
        path: 'losses',
        populate: {
          path: 'games',
          model: 'TicTacToe',
          populate: [
            { path: 'playerX', model: 'User' },
            { path: 'playerO', model: 'User' },
          ],
        },
      })
      .sort({ 'wins.nb': -1, 'draws.nb': -1, 'losses.nb': 1 })
      .exec();
    // return leaderboard.sort((a, b) => {
    //   if (a.wins.length !== b.wins.length) return b.wins.length - a.wins.length;
    //   if (a.draws.length !== b.draws.length)
    //     return b.draws.length - a.draws.length;
    //   return a.losses.length - b.losses.length;
    // });
    return leaderboard;
  }

  async update(
    id: string,
    updateTicTacToeDto: UpdateTicTacToeDto,
    playerId: string,
  ): Promise<TicTacToeDocument> {
    const ticTacToe = await this.findOne(id);

    // On vérifie que la partie n'est pas déjà terminée
    if (ticTacToe.isFinished) {
      throw new BadRequestException('Cette partie est déjà terminée');
    }

    // On vérifie que le joueur qui veut jouer est bien le joueur dont c'est le tour
    let playerTurn: User | undefined = undefined;
    let playerSymbol: 'X' | 'O';
    if (ticTacToe.turn % 2 === 0) {
      playerTurn =
        ticTacToe.firstPlayer === 'X' ? ticTacToe.playerO : ticTacToe.playerX;
      playerSymbol = ticTacToe.firstPlayer === 'X' ? 'O' : 'X';
    } else {
      playerTurn =
        ticTacToe.firstPlayer === 'X' ? ticTacToe.playerX : ticTacToe.playerO;
      playerSymbol = ticTacToe.firstPlayer === 'X' ? 'X' : 'O';
    }

    if (
      (playerTurn && playerTurn._id.toString() !== playerId) ||
      playerSymbol !== updateTicTacToeDto.player
    ) {
      throw new BadRequestException("Ce n'est pas à votre tour de jouer");
    }

    // On vérifie que le coup du joueur est valide
    if (ticTacToe.grid[updateTicTacToeDto.index] !== '') {
      throw new BadRequestException('Vous ne pouvez pas jouer ici');
    }

    // On applique le coup du joueur
    ticTacToe.grid[updateTicTacToeDto.index] = updateTicTacToeDto.player;
    ticTacToe.turn++;

    // Si le joueur joue contre l'ordinateur et que la partie n'est pas terminée, on fait jouer l'ordinateur
    if (
      !isFinished(ticTacToe) &&
      !ticTacToe.playerO &&
      updateTicTacToeDto.player === 'X'
    ) {
      // Ancienne methode
      // computerMove(ticTacToe);
      // ticTacToe.turn++;
      computerMoveMinMax(ticTacToe);
      isFinished(ticTacToe);
    }

    await ticTacToe.save();

    // Si la partie est finie, on met à jour les statistiques des joueurs
    if (ticTacToe.isFinished) {
      this.logger.debug(`Partie terminée : mise à jour du leaderboard...`);
      await this.updatePlayerStats(ticTacToe);
    }

    return ticTacToe;
  }

  async updatePlayerStats(ticTacToe: TicTacToeDocument): Promise<void> {
    this.logger.debug(
      `Recherche du classement du joueur X (id: ${ticTacToe.playerX._id})...`,
    );
    let playerX = await this.ticTacToePlayerModel
      .findOne({
        player: ticTacToe.playerX._id,
      })
      .populate('player')
      .populate({
        path: 'wins',
        populate: { path: 'games', model: 'TicTacToe' },
      })
      .populate({
        path: 'draws',
        populate: { path: 'games', model: 'TicTacToe' },
      })
      .populate({
        path: 'losses',
        populate: { path: 'games', model: 'TicTacToe' },
      })
      .exec();
    if (!playerX) {
      this.logger.debug(
        `Joueur X (id: ${ticTacToe.playerX._id}) non trouvé : création de son classement...`,
      );
      playerX = new this.ticTacToePlayerModel({
        player: new Types.ObjectId(ticTacToe.playerX._id),
        wins: new this.TicTacToePlayerGamesModel(),
        draws: new this.TicTacToePlayerGamesModel(),
        losses: new this.TicTacToePlayerGamesModel(),
      });
    }
    let playerO: TicTacToePlayerDocument | null = null;
    if (ticTacToe.playerO) {
      this.logger.debug(
        `Recherche du classement du joueur O (id: ${ticTacToe.playerO?._id})...`,
      );
      playerO = await this.ticTacToePlayerModel
        .findOne({
          player: ticTacToe.playerO._id,
        })
        .populate('player')
        .populate({
          path: 'wins',
          populate: { path: 'games', model: 'TicTacToe' },
        })
        .populate({
          path: 'draws',
          populate: { path: 'games', model: 'TicTacToe' },
        })
        .populate({
          path: 'losses',
          populate: { path: 'games', model: 'TicTacToe' },
        })
        .exec();

      if (!playerO) {
        this.logger.debug(
          `Joueur O (id: ${ticTacToe.playerO._id}) non trouvé : création de son classement.`,
        );
        playerO = new this.ticTacToePlayerModel({
          player: new Types.ObjectId(ticTacToe.playerO._id),
          wins: new this.TicTacToePlayerGamesModel(),
          draws: new this.TicTacToePlayerGamesModel(),
          losses: new this.TicTacToePlayerGamesModel(),
        });
      }
    }

    if (ticTacToe.winner === 'X') {
      this.logger.debug(
        `Ajout de la victoire au classement du joueur X (id: ${ticTacToe.playerX._id}).`,
      );
      playerX.wins.nb++;
      playerX.wins.games.push(ticTacToe);
      if (playerO) {
        this.logger.debug(
          `Ajout de la défaite au classement du joueur O (id: ${ticTacToe.playerO._id}).`,
        );
        playerO.losses.nb++;
        playerO.losses.games.push(ticTacToe);
      }
    } else if (ticTacToe.winner === 'O') {
      this.logger.debug(
        `Ajout de la défaite au classement du joueur X (id: ${ticTacToe.playerX._id}).`,
      );
      playerX.losses.nb++;
      playerX.losses.games.push(ticTacToe);
      if (playerO) {
        this.logger.debug(
          `Ajout de la victoire au classement du joueur O (id: ${ticTacToe.playerO._id}).`,
        );
        playerO.wins.nb++;
        playerO.wins.games.push(ticTacToe);
      }
    } else {
      this.logger.debug(
        `Ajout du match nul au classement du joueur X (id: ${ticTacToe.playerX._id}).`,
      );
      playerX.draws.nb++;
      playerX.draws.games.push(ticTacToe);
      if (playerO) {
        this.logger.debug(
          `Ajout du match nul au classement du joueur O (id: ${ticTacToe.playerO._id}).`,
        );
        playerO.draws.nb++;
        playerO.draws.games.push(ticTacToe);
      }
    }

    await playerX.save();
    if (playerO) {
      await playerO.save();
    }
  }

  async remove(id: string): Promise<TicTacToeDocument> {
    return this.ticTacToeModel
      .findByIdAndDelete(id)
      .populate('playerX')
      .populate('playerO')
      .exec();
  }
}
