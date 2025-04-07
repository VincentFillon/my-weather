import { Logger } from '@nestjs/common';
import {
  PongDocument,
  Position,
} from 'src/resources/pong/entities/pong.entity';

interface Bounce {
  x: number;
  y: number;
  velocity: number;
}

export const saveInterval = 1000;
export const fieldSize = { x: 200, y: 150 };
export const racketWidth = 5;
export const racketHeight = 30;
export const ballRadius = 5;
export const ballMinVelocity = 40;
export const ballMaxVelocity = 150;
export const maxIARacketVelocity = 150;

export const updateBallPosition = (
  game: PongDocument,
  deltaTime: number,
  logger?: Logger,
) => {
  game.ballPosition.x += game.ballVx * deltaTime;
  game.ballPosition.y += game.ballVy * deltaTime;

  // Rebond sur les murs (direction Y)
  if (
    game.ballPosition.y <= ballRadius ||
    game.ballPosition.y >= fieldSize.y - ballRadius
  ) {
    logger?.log(`[${game._id.toString()}] Balle : rebond sur un mur`);
    logger?.log(
      `[${game._id.toString()}] Balle : changement de direction { x: ${game.ballVx}, y: ${game.ballVy} } => { x: ${game.ballVx}, y: ${-game.ballVy} }`,
    );
    game.ballVy *= -1;
    game.ballPosition.y =
      game.ballVy > 0 ? ballRadius + 1 : fieldSize.y - ballRadius - 1;
  }
};

export const calcRacketBounce = (
  racketPosition: Position,
  racketVelocity: number,
  ballPosition: Position,
  ballVx: number,
  ballVy: number,
  ballVelocity: number,
): Bounce => {
  // 1. Inversion de la direction X (rebond de base).
  const newBallVx = -ballVx;

  // 2. Calcul de la position relative de l'impact sur la raquette.
  const relativeImpactY = ballPosition.y - racketPosition.y;
  const normalizedImpact = relativeImpactY / (racketHeight / 2); // entre -1 et 1

  // 3. Calcul de l'ajustement de l'angle du rebond
  const bounceAngle = normalizedImpact * 0.5 + racketVelocity * 0.3; // Ajustement
  const originalAngle = Math.atan2(ballVy, ballVx);
  const newAngle = originalAngle + bounceAngle;
  // Augmenter la vitesse de la balle
  let newBallVelocity = ballVelocity * 1.05;
  if (Math.abs(racketVelocity) > ballVelocity) {
    newBallVelocity += Math.abs(racketVelocity) * 0.05;
  }
  const newBallVy = newBallVelocity * Math.sin(newAngle);
  return {
    x: newBallVx,
    y: newBallVy,
    velocity: newBallVelocity,
  };
};

export const checkRacketCollision = (game: PongDocument, logger?: Logger) => {
  // Collision avec la raquette de gauche
  if (
    game.ballPosition.x - ballRadius <= racketWidth &&
    game.ballPosition.y + ballRadius >=
      game.player1RacketPosition.y - racketHeight / 2 &&
    game.ballPosition.y - ballRadius <=
      game.player1RacketPosition.y + racketHeight / 2
  ) {
    logger?.log(
      `[${game._id.toString()}] Balle : rebond sur la raquette de gauche`,
    );
    const bounce = calcRacketBounce(
      game.player1RacketPosition,
      game.player1RacketVelocity,
      game.ballPosition,
      game.ballVx,
      game.ballVy,
      game.ballVelocity,
    );
    logger?.log(
      `[${game._id.toString()}] Balle : changement de direction { x: ${game.ballVx}, y: ${game.ballVy} } => { x: ${bounce.x}, y: ${bounce.y} }`,
    );
    game.ballVx = bounce.x;
    game.ballVy = bounce.y;
    game.ballVelocity = bounce.velocity;
    game.ballPosition.x = racketWidth + ballRadius + 1;
  }

  // Collision avec la raquette de droite
  if (
    game.ballPosition.x + ballRadius >= fieldSize.x - racketWidth &&
    game.ballPosition.y + ballRadius >=
      game.player2RacketPosition.y - racketHeight / 2 &&
    game.ballPosition.y - ballRadius <=
      game.player2RacketPosition.y + racketHeight / 2
  ) {
    logger?.log(
      `[${game._id.toString()}] Balle : rebond sur la raquette de droite...`,
    );
    const bounce = calcRacketBounce(
      game.player2RacketPosition,
      game.player2RacketVelocity,
      game.ballPosition,
      game.ballVx,
      game.ballVy,
      game.ballVelocity,
    );
    game.ballVx = bounce.x; // Mise à jour de la vitesse
    game.ballVy = bounce.y; // Mise à jour de la vitesse
    logger?.log(
      `[${game._id.toString()}] Balle : changement de direction { x: ${game.ballVx}, y: ${game.ballVy} } => { x: ${bounce.x}, y: ${bounce.y} }`,
    );
    game.ballVelocity = bounce.velocity;
    game.ballPosition.x = fieldSize.x - racketWidth - ballRadius - 1;
  }
};

export const checkScore = (game: PongDocument) => {
  if (game.ballPosition.x < 0) {
    game.winner = 2;
    game.isFinished = true;
  } else if (game.ballPosition.x > fieldSize.x) {
    game.winner = 1;
    game.isFinished = true;
  }
};

/**
 * Génère un nombre entier aléatoire entre 0 et maxValue (inclus)
 * avec une distribution logarithmique, privilégiant les nombres plus petits.
 *
 * @param maxValue - La valeur maximale possible pour le nombre aléatoire.
 * @returns - Un nombre entier aléatoire avec une distribution logarithmique.
 */
export const logRandomInt = (maxValue: number): number => {
  // Génère un nombre aléatoire flottant entre 0 et 1.
  const rand0To1: number = Math.random();

  // Applique une fonction logarithmique inverse (exponentielle) pour biaiser la distribution.
  // Utilise une base plus petite pour accentuer la probabilité des nombres plus petits.
  const base: number = 2; // Vous pouvez ajuster cette base (ex : 1.5, 3) pour modifier la distribution.
  const logValue: number = Math.pow(base, rand0To1);

  // Met à l'échelle la valeur logarithmique pour qu'elle corresponde à la plage [0, maxValue].
  const scaledValue: number = (logValue - 1) * (maxValue / (base - 1));

  // S'assure que la valeur est dans la plage valide et la convertit en un entier.
  const result: number = Math.min(
    Math.max(Math.round(scaledValue), 0),
    maxValue,
  );

  return result;
};

export const moveIAPlayer = (game: PongDocument, deltaTime: number) => {
  const maxRacketSpeed = logRandomInt(maxIARacketVelocity); // Aléatoire
  const ballTargetY = game.ballPosition.y;

  // Ajout d'une "erreur" aléatoire à la position cible
  const aimError = logRandomInt(30) - 15; // Plage de -15 à +15 pixels
  const targetYWithAimError = ballTargetY + aimError;

  // Calcul de la distance à parcourir
  const distanceToTarget = targetYWithAimError - game.player2RacketPosition.y;

  // La vitesse max dépend aléatoirement,
  // on gère la fluidité et le comportement en limitant la vitesse
  const dy = Math.min(
    Math.max(
      distanceToTarget,
      -maxRacketSpeed * deltaTime, // Vitesse minimale
    ),
    maxRacketSpeed * deltaTime, // Vitesse maximale
  );

  // Déplacement de la raquette
  const newY = game.player2RacketPosition.y + dy;
  game.player2RacketPosition.y = Math.min(Math.max(newY, 0), fieldSize.y);
};
