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
export const ballMinVelocity = 100;
export const ballMaxVelocity = 150;
export const maxIARacketVelocity = 100;

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
  logger?: Logger,
): Bounce => {
  // 1. Inversion de la direction X (rebond de base).
  const newBallVx = -ballVx;

  // 2. Calcul de la position relative de l'impact sur la raquette.
  const relativeImpactY = ballPosition.y - racketPosition.y;
  const normalizedImpact = relativeImpactY / (racketHeight / 2); // entre -1 et 1

  // 3. Calcul de l'angle de rebond basé sur la position d'impact et la vitesse de la raquette (spin)
  // Angle de rebond de base (plus la balle frappe le bord, plus l'angle est prononcé)
  // Utilisation de Math.PI / 3 (60 degrés) comme angle maximal pour un impact sur le bord
  // 3. Calcul de l'angle de rebond basé sur la position d'impact et la vitesse de la raquette (spin)
  const maxBounceAngle = Math.PI / 3; // 60 degrés, pour un rebond plus dynamique
  const spinFactor = 0.005; // Réduit l'effet de spin pour le rendre plus subtil

  let newAngle: number;
  let newBallVy: number;
  let newBallVelocity = ballVelocity * 1.05; // Augmentation de base de la vitesse

  // Détection d'un impact sur les coins de la raquette
  const cornerThreshold = 0.9; // Si normalizedImpact est > 0.9 ou < -0.9
  if (Math.abs(normalizedImpact) > cornerThreshold) {
    // Effet spécial pour les coins : augmentation de vitesse et inversion de la direction Y
    newBallVelocity = ballVelocity * 1.15; // Augmentation plus significative de la vitesse
    newBallVy = -ballVy; // Inversion de la direction Y pour un effet "smash" ou "coupé"
    // Ajuster légèrement l'angle pour donner une direction en fonction du coin touché
    newAngle = normalizedImpact * maxBounceAngle;
    newBallVy = newBallVelocity * Math.sin(newAngle); // Recalculer Vy avec le nouvel angle
  } else {
    // Calcul de l'angle de rebond normal
    newAngle = normalizedImpact * maxBounceAngle;

    // Ajout de l'effet de "spin" basé sur la vitesse de la raquette (réduit)
    newAngle += racketVelocity * spinFactor;

    // Limiter l'angle pour éviter des rebonds trop verticaux ou inversés
    newAngle = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, newAngle));

    // Si la vitesse de la raquette est supérieure à la vitesse de la balle, augmenter la vitesse de la balle
    if (Math.abs(racketVelocity) > ballVelocity) {
      newBallVelocity += Math.abs(racketVelocity) * 0.05;
    }

    // Calcul des nouvelles composantes de vitesse
    // Conserver la direction verticale (signe de ballVy)
    newBallVy = newBallVelocity * Math.sin(newAngle);
    // S'assurer que la direction Y ne s'inverse pas si elle ne devrait pas
    if (Math.sign(ballVy) !== Math.sign(newBallVy) && Math.abs(normalizedImpact) < 0.5) {
        newBallVy *= -1; // Inverser si le signe a changé de manière inattendue pour les impacts centraux
    }
  }
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
      `[${game._id.toString()}] Balle : rebond sur la raquette de gauche...`,
    );
    const bounce = calcRacketBounce(
      game.player1RacketPosition,
      game.player1RacketVelocity,
      game.ballPosition,
      game.ballVx,
      game.ballVy,
      game.ballVelocity,
      logger,
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
      logger,
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
  // Vitesse de base de la raquette de l'IA (peut être ajustée pour la difficulté)
  const baseRacketSpeed = maxIARacketVelocity * 0.6; // Réduit à 60% pour rendre l'IA moins forte
  // Petite variation aléatoire pour simuler un comportement moins prévisible
  const maxRacketSpeed = baseRacketSpeed + (Math.random() * 30 - 15); // +/- 15 de variation

  // Prédiction de la position future de la balle
  // Calcul du temps estimé pour que la balle atteigne la raquette de l'IA
  const timeToReachRacket =
    Math.abs(fieldSize.x - racketWidth - game.ballPosition.x) /
    Math.abs(game.ballVx);

  // Prédiction de la position Y de la balle au moment de l'impact
  let predictedBallY = game.ballPosition.y + game.ballVy * timeToReachRacket;

  // Gérer les rebonds de la balle sur les murs pendant la prédiction
  // Si la balle va rebondir sur un mur avant d'atteindre la raquette de l'IA
  if (predictedBallY < ballRadius || predictedBallY > fieldSize.y - ballRadius) {
    // Calculer le temps jusqu'au premier rebond
    const timeToWall =
      game.ballVy > 0
        ? (fieldSize.y - ballRadius - game.ballPosition.y) / game.ballVy
        : (ballRadius - game.ballPosition.y) / game.ballVy;

    // Si le rebond se produit avant d'atteindre la raquette de l'IA
    if (timeToWall < timeToReachRacket) {
      predictedBallY =
        (game.ballPosition.y + game.ballVy * timeToWall) * -1 +
        (game.ballVy > 0 ? fieldSize.y - ballRadius : ballRadius);
      // Ajuster la position prédite après le rebond
      predictedBallY =
        (game.ballPosition.y + game.ballVy * timeToWall) +
        (game.ballVy * (timeToReachRacket - timeToWall)) * -1;
    }
  }

  // Ajout d'une "erreur" plus subtile et contrôlée
  // L'erreur peut être basée sur la difficulté ou un facteur aléatoire plus petit
  const aimError = (Math.random() * 20 - 10); // Plage de -10 à +10 pixels, plus d'erreurs
  const targetYWithAimError = predictedBallY + aimError;

  // Calcul de la distance à parcourir
  const distanceToTarget = targetYWithAimError - game.player2RacketPosition.y;

  // Introduire une "zone morte" pour éviter le tremblement
  const deadZone = 10; // Augmenté à 10 pixels pour réduire le tremblement
  let dy = 0;

  if (Math.abs(distanceToTarget) > deadZone) {
    // Déplacement de la raquette avec une vitesse limitée
    dy = Math.min(
      Math.max(
        distanceToTarget,
        -maxRacketSpeed * deltaTime, // Vitesse minimale
      ),
      maxRacketSpeed * deltaTime, // Vitesse maximale
    );
  }

  // Déplacement de la raquette
  const newY = game.player2RacketPosition.y + dy;
  game.player2RacketPosition.y = Math.min(
    Math.max(newY, racketHeight / 2), // Limite supérieure
    fieldSize.y - racketHeight / 2, // Limite inférieure
  );
};
