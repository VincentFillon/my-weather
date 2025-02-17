import {
  TicTacToeDocument,
  TicTacToeValue,
} from 'src/resources/tic-tac-toe/entities/tic-tac-toe.entity';

/**
 * Récupération des index des cases vides
 * @param grid Grille de jeu
 * @returns Liste des index des cases vides
 */
export const avail = (grid: TicTacToeValue[]): number[] => {
  return grid.reduce((p, c, i) => (c === '' ? p.concat([i]) : p), []);
};

/**
 * Permet de vérifier si le joueur donné gagne sur la grille de jeu
 * @param grid Grille de jeu
 * @param player Joueur à vérifier
 * @returns `true` si le joueur a gagné, `false` sinon
 */
export const winning = (grid: TicTacToeValue[], player: 'X' | 'O') => {
  return (
    (grid[0] == player && grid[1] == player && grid[2] == player) ||
    (grid[3] == player && grid[4] == player && grid[5] == player) ||
    (grid[6] == player && grid[7] == player && grid[8] == player) ||
    (grid[0] == player && grid[3] == player && grid[6] == player) ||
    (grid[1] == player && grid[4] == player && grid[7] == player) ||
    (grid[2] == player && grid[5] == player && grid[8] == player) ||
    (grid[0] == player && grid[4] == player && grid[8] == player) ||
    (grid[2] == player && grid[4] == player && grid[6] == player)
  );
};

interface MinimaxResult {
  index?: number;
  score: number;
}

/**
 * Implémente l'algorithme minimax pour déterminer le meilleur coup pour le
 * joueur artificiel dans une partie de Tic-Tac-Toe. Il évalue de manière
 * récursive toutes les possibilités de coups en fonction de l'état actuel de la
 * grille.
 *
 * @param ticTacToe - L'état actuel de la grille de jeu sous forme de tableau.
 * @param player - Le joueur actuel, soit 'X', soit 'O'.
 * @param aiPlayer - Joueur artificiel, soit 'X', soit 'O'.
 * @returns Un objet représentant le meilleur coup, incluant son index et son
 *          score. Un score de +10 indique une victoire pour le joueur
 *          artificiel, -10 indique une victoire pour le joueur humain, et 0
 *          indique un match nul.
 */
export const minimax = (
  grid: TicTacToeValue[],
  player: 'X' | 'O',
  aiPlayer: 'X' | 'O' = 'O',
  depth: number = 0,
): MinimaxResult => {
  // On détermine qui est le joueur humain
  const huPlayer = aiPlayer === 'X' ? 'O' : 'X';
  // On récupère la liste des index des cases vides qui peuvent encore être jouées
  let emptyCells = avail(grid);

  // Si le joueur humain a gagné, on ne retourne pas d'index et on attribue un score de -10
  if (winning(grid, huPlayer)) {
    return {
      score: -10 + depth, // Le résultat est atténué en fonction du nombre de coups qu'il a fallu pour y parvenir
    };
  }
  // Si l'ordinateur a gagné, on ne retourne pas d'index et on attribue un score de +10
  else if (winning(grid, aiPlayer)) {
    return {
      score: 10 - depth, // Le résultat est atténué en fonction du nombre de coups qu'il a fallu pour y parvenir
    };
  }
  // Si la partie est terminée, on ne retourne pas d'index et on attribue un score de 0
  else if (emptyCells.length === 0) {
    return {
      score: 0,
    };
  }

  // On crée un tableau pour stocker le score de chaque coup possible
  const moves: MinimaxResult[] = [];
  for (var i = 0; i < emptyCells.length; i++) {
    // On créé un clone de la grille de jeu pour dissocier les scénarios entre eux
    const gridClone = [...grid];
    // On initialise le prochain coup possible
    const move: MinimaxResult = {
      index: emptyCells[i],
      score: 0,
    };
    gridClone[emptyCells[i]] = player;

    // On simule le coup du joueur suivant pour récupérer calculer le score cumulé
    if (player == aiPlayer) {
      const g = minimax(gridClone, huPlayer, aiPlayer, depth + 1);
      move.score = g.score;
    } else {
      const g = minimax(gridClone, aiPlayer, aiPlayer, depth + 1);
      move.score = g.score;
    }

    moves.push(move);
  }

  // On récupère le coup avec le meilleur score
  let bestMove = 0;
  let bestScore = -10;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].score > bestScore) {
      bestScore = moves[i].score;
      bestMove = i;
    }
  }

  // On retourne le meilleur coup
  return moves[bestMove];
};

/**
 * Vérifie si la partie est terminée
 * @param ticTacToe Partie à vérifier
 * @param update Indique si on doit mettre à jour la partie ou non
 * @returns Partie (mise à jour si `update=true`)
 */
export const isFinished = (
  ticTacToe: TicTacToeDocument,
  update: boolean = true,
): boolean => {
  // Si toutes les cases sont remplies, la partie est terminée (match nul)
  if (ticTacToe.turn > 9) {
    if (update) {
      ticTacToe.isFinished = true;
      ticTacToe.winner = '';
      return ticTacToe.isFinished;
    } else return true;
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
    if (update) {
      ticTacToe.winner = c1;
      ticTacToe.isFinished = true;
    } else return true;
  }
  if (cond2 || cond5 || cond8) {
    if (update) {
      ticTacToe.winner = c5;
      ticTacToe.isFinished = true;
    } else return true;
  }
  if (cond3 || cond6) {
    if (update) {
      ticTacToe.winner = c9;
      ticTacToe.isFinished = true;
    } else return true;
  }

  return ticTacToe.isFinished;
};

/**
 * Mouvement de l'ordinateur
 * @param ticTacToe Partie en cours
 * @returns Partie mise à jour avec le coup de l'ordinateur
 */
export const computerMove = (
  ticTacToe: TicTacToeDocument,
): TicTacToeDocument => {
  // On vérifie si on a une possibilité de gagner
  let move = getNextPlayWin(ticTacToe);

  // Sinon, on bloque un éventuel coup gagant du joueur
  if (move === -1) {
    move = blockPlayerWin(ticTacToe);
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
};

/**
 * Mouvement de l'ordinateur (basé sur l'algorithme MinMax)
 * @param ticTacToe Partie en cours
 * @param player Joueur (humain)
 * @returns Partie mise à jour avec le coup de l'ordinateur
 */
export const computerMoveMinMax = (
  ticTacToe: TicTacToeDocument,
  aiPlayer: 'X' | 'O' = 'O',
): TicTacToeDocument => {
  // On créé une copie de la grille de jeu (pour ne pas modifier l'original lors des itérations)
  const grid = [...ticTacToe.grid];

  const index = minimax(grid, aiPlayer, aiPlayer).index;
  // Si un coup a été trouvé, on le joue (sur la grille de jeu originale)
  if (index != null) {
    ticTacToe.grid[index] = aiPlayer;
    ticTacToe.turn++;
  }
  // Si aucun coup n'est trouvé c'est que la partie est terminée donc on ne fait rien

  return ticTacToe;
};

/**
 * Retourne le prochain coup à jouer pour empêcher un coup gagnant du joueur
 * @param ticTacToe Partie en cours
 * @returns Index du coup à jour pour empêcher le joueur de gagner sur le prochain coup
 */
export const blockPlayerWin = (ticTacToe: TicTacToeDocument): number => {
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
};

/**
 * Déterminer le prochain coup à jouer pour gagner la partie
 * @param ticTacToe Partie en cours
 * @param player Joueur pour lequel déterminer le prochain coup
 * @returns Index du prochain coup à jouer pour gagner la partie
 */
export const getNextPlayWin = (
  ticTacToe: TicTacToeDocument,
  player: 'X' | 'O' = 'O',
): number => {
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
};
