import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { PlayerGames } from 'src/resources/tic-tac-toe/entities/player-games.entity';
import {
  TicTacToePlayer,
  TicTacToePlayerDocument,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe-player.entity';
import {
  TicTacToe,
  TicTacToeDocument,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';
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
    @InjectModel(PlayerGames.name)
    private playerGamesModel: Model<PlayerGames>,
  ) {}

  async create(
    createTicTacToeDto: CreateTicTacToeDto,
  ): Promise<TicTacToeDocument> {
    const ticTacToe = new this.ticTacToeModel({
      playerX: { _id: new Types.ObjectId(createTicTacToeDto.playerX._id) },
      playerO: createTicTacToeDto.playerO
        ? { _id: new Types.ObjectId(createTicTacToeDto.playerO._id) }
        : null,
    });
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
      user: new Types.ObjectId(userId),
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

  private isFinished(ticTacToe: TicTacToeDocument): boolean {
    // Si toutes les cases sont remplies, la partie est terminée (match nul)
    if (ticTacToe.turn > 9) {
      ticTacToe.isFinished = true;
      ticTacToe.winner = '';
      return ticTacToe.isFinished;
    }

    const c1 = ticTacToe.grid[0];
    const c2 = ticTacToe.grid[1];
    const c3 = ticTacToe.grid[2];
    const c4 = ticTacToe.grid[3];
    const c5 = ticTacToe.grid[4];
    const c6 = ticTacToe.grid[5];
    const c7 = ticTacToe.grid[6];
    const c8 = ticTacToe.grid[7];
    const c9 = ticTacToe.grid[8];

    const cond1 = c1 && c2 && c3 && c1 === c2 && c2 === c3;
    const cond2 = c4 && c5 && c6 && c4 === c5 && c5 === c6;
    const cond3 = c7 && c8 && c9 && c7 === c8 && c8 === c9;
    const cond4 = c1 && c4 && c7 && c1 === c4 && c4 === c7;
    const cond5 = c2 && c5 && c8 && c2 === c5 && c5 === c8;
    const cond6 = c3 && c6 && c9 && c3 === c6 && c6 === c9;
    const cond7 = c1 && c5 && c9 && c1 === c5 && c5 === c9;
    const cond8 = c3 && c5 && c7 && c3 === c5 && c5 === c7;

    if (cond1 || cond4 || cond7) {
      ticTacToe.winner = c1;
      ticTacToe.isFinished = true;
    }
    if (cond2 || cond5 || cond8) {
      ticTacToe.winner = c5;
      ticTacToe.isFinished = true;
    }
    if (cond3 || cond6) {
      ticTacToe.winner = c9;
      ticTacToe.isFinished = true;
    }

    return ticTacToe.isFinished;
  }

  // Mouvement de l'IA
  computerMove(ticTacToe: TicTacToeDocument): TicTacToeDocument {
    // On vérifie si on a une possibilité de gagner
    let move = this.getNextPlayWin(ticTacToe);

    // Sinon, on bloque un éventuel coup gagant du joueur
    if (move === -1) {
      move = this.blockPlayerWin(ticTacToe);
    }

    // Sinon, on joue aléatoirement
    if (move === -1) {
      const emptyCells = ticTacToe.grid
        .map((value, index) => (value === '' ? index : -1))
        .filter((index) => index !== -1);
      move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    ticTacToe.grid[move] = 'O';

    return ticTacToe;
  }

  // IA : Bloque un coup gagnant du joueur
  blockPlayerWin(ticTacToe: TicTacToeDocument): number {
    const c1 = ticTacToe.grid[0];
    const c2 = ticTacToe.grid[1];
    const c3 = ticTacToe.grid[2];
    const c4 = ticTacToe.grid[3];
    const c5 = ticTacToe.grid[4];
    const c6 = ticTacToe.grid[5];
    const c7 = ticTacToe.grid[6];
    const c8 = ticTacToe.grid[7];
    const c9 = ticTacToe.grid[8];

    if (c1 && c2 && !c3 && c1 === c2) {
      return 2;
    }
    if (!c1 && c2 && c3 && c2 === c3) {
      return 0;
    }
    if (c1 && !c2 && c3 && c1 === c3) {
      return 1;
    }

    if (c4 && c5 && !c6 && c4 === c5) {
      return 5;
    }
    if (!c4 && c5 && c6 && c5 === c6) {
      return 3;
    }
    if (c4 && !c5 && c6 && c4 === c6) {
      return 4;
    }

    if (c7 && c8 && !c9 && c7 === c8) {
      return 8;
    }
    if (!c7 && c8 && c9 && c8 === c9) {
      return 6;
    }
    if (c7 && !c8 && c9 && c7 === c9) {
      return 7;
    }

    if (c1 && c4 && !c7 && c1 === c4) {
      return 6;
    }
    if (!c1 && c4 && c7 && c4 === c7) {
      return 0;
    }
    if (c1 && !c4 && c7 && c1 === c7) {
      return 3;
    }

    if (c2 && c5 && !c8 && c2 === c5) {
      return 7;
    }
    if (!c2 && c5 && c8 && c5 === c8) {
      return 1;
    }
    if (c2 && !c5 && c8 && c2 === c8) {
      return 4;
    }

    if (c3 && c6 && !c9 && c3 === c6) {
      return 8;
    }
    if (!c3 && c6 && c9 && c6 === c9) {
      return 2;
    }
    if (c3 && !c6 && c9 && c3 === c9) {
      return 5;
    }

    if (c1 && c5 && !c9 && c1 === c5) {
      return 8;
    }
    if (!c1 && c5 && c9 && c5 === c9) {
      return 0;
    }
    if (c1 && !c5 && c9 && c1 === c9) {
      return 4;
    }

    if (c3 && c5 && !c7 && c3 === c5) {
      return 6;
    }
    if (!c3 && c5 && c7 && c5 === c7) {
      return 2;
    }
    if (c3 && !c5 && c7 && c3 === c7) {
      return 4;
    }

    return -1;
  }

  // IA : Coche la case pour un coup gagnant
  getNextPlayWin(
    ticTacToe: TicTacToeDocument,
    player: 'X' | 'O' = 'O',
  ): number {
    const c1 = ticTacToe.grid[0];
    const c2 = ticTacToe.grid[1];
    const c3 = ticTacToe.grid[2];
    const c4 = ticTacToe.grid[3];
    const c5 = ticTacToe.grid[4];
    const c6 = ticTacToe.grid[5];
    const c7 = ticTacToe.grid[6];
    const c8 = ticTacToe.grid[7];
    const c9 = ticTacToe.grid[8];

    if (c1 && c2 && !c3 && c1 === c2 && c2 === player) {
      return 2;
    }
    if (!c1 && c2 && c3 && c2 === c3 && c3 === player) {
      return 0;
    }
    if (c1 && !c2 && c3 && c1 === c3 && c3 === player) {
      return 1;
    }

    if (c4 && c5 && !c6 && c4 === c5 && c5 === player) {
      return 5;
    }
    if (!c4 && c5 && c6 && c5 === c6 && c6 === player) {
      return 3;
    }
    if (c4 && !c5 && c6 && c4 === c6 && c6 === player) {
      return 4;
    }

    if (c7 && c8 && !c9 && c7 === c8 && c8 === player) {
      return 8;
    }
    if (!c7 && c8 && c9 && c8 === c9 && c9 === player) {
      return 6;
    }
    if (c7 && !c8 && c9 && c7 === c9 && c9 === player) {
      return 7;
    }

    if (c1 && c4 && !c7 && c1 === c4 && c4 === player) {
      return 6;
    }
    if (!c1 && c4 && c7 && c4 === c7 && c7 === player) {
      return 0;
    }
    if (c1 && !c4 && c7 && c1 === c7 && c7 === player) {
      return 3;
    }

    if (c2 && c5 && !c8 && c2 === c5 && c5 === player) {
      return 7;
    }
    if (!c2 && c5 && c8 && c5 === c8 && c8 === player) {
      return 1;
    }
    if (c2 && !c5 && c8 && c2 === c8 && c8 === player) {
      return 4;
    }

    if (c3 && c6 && !c9 && c3 === c6 && c6 === player) {
      return 8;
    }
    if (!c3 && c6 && c9 && c6 === c9 && c9 === player) {
      return 2;
    }
    if (c3 && !c6 && c9 && c3 === c9 && c9 === player) {
      return 5;
    }

    if (c1 && c5 && !c9 && c1 === c5 && c5 === player) {
      return 8;
    }
    if (!c1 && c5 && c9 && c5 === c9 && c9 === player) {
      return 0;
    }
    if (c1 && !c5 && c9 && c1 === c9 && c9 === player) {
      return 4;
    }

    if (c3 && c5 && !c7 && c3 === c5 && c5 === player) {
      return 6;
    }
    if (!c3 && c5 && c7 && c5 === c7 && c7 === player) {
      return 2;
    }
    if (c3 && !c5 && c7 && c3 === c7 && c7 === player) {
      return 4;
    }

    return -1;
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
      playerTurn = ticTacToe.playerO;
      playerSymbol = 'O';
    } else {
      playerTurn = ticTacToe.playerX;
      playerSymbol = 'X';
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
      !this.isFinished(ticTacToe) &&
      !ticTacToe.playerO &&
      updateTicTacToeDto.player === 'X'
    ) {
      this.computerMove(ticTacToe);
      ticTacToe.turn++;
      this.isFinished(ticTacToe);
    }

    await ticTacToe.save();

    // Si la partie est finie, on met à jour les statistiques des joueurs
    if (ticTacToe.isFinished) {
      this.logger.debug(`Partie terminée : mise à jour du leaderboard...`);

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
          wins: new this.playerGamesModel(),
          draws: new this.playerGamesModel(),
          losses: new this.playerGamesModel(),
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
            wins: new this.playerGamesModel(),
            draws: new this.playerGamesModel(),
            losses: new this.playerGamesModel(),
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

    return ticTacToe;
  }

  async remove(id: string): Promise<TicTacToeDocument> {
    return this.ticTacToeModel
      .findByIdAndDelete(id)
      .populate('playerX')
      .populate('playerO')
      .exec();
  }
}
