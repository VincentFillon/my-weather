import { Server } from 'socket.io';
import {
  PongDocument,
  Position,
} from 'src/resources/pong/entities/pong.entity';

export const fieldSize = { x: 200, y: 150 };

export const startGameLoop = (
  socket: Server,
  game: PongDocument,
): NodeJS.Timeout => {
  let lastUpdate = Date.now();

  const gameLoop = setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = now;

    // Mise à jour de la balle
    updateBallPosition(game, deltaTime);

    // Vérification des collisions avec les raquettes
    checkRacketCollision(game);

    // Vérification du score (si la balle sort du terrain)
    checkScore(game);

    // Envoi des mises à jour aux joueurs
    socket.to(game._id.toString()).emit('pongUpdated', {
      ballPosition: game.ballPosition,
      player1RacketPosition: game.player1RacketPosition,
      player2RacketPosition: game.player2RacketPosition,
    });

    if (game.isFinished) {
      clearInterval(gameLoop);
    }
  }, 16); // ~60 FPS

  return gameLoop;
};

function updateBallPosition(game: PongDocument, deltaTime: number) {
  game.ballPosition.x += game.ballDirection.x * game.ballVelocity * deltaTime;
  game.ballPosition.y += game.ballDirection.y * game.ballVelocity * deltaTime;

  // Rebond sur les murs haut et bas
  if (game.ballPosition.y <= 0 || game.ballPosition.y >= fieldSize.y) {
    game.ballDirection.y *= -1;
  }

  // Vérification collision avec la raquette du joueur 1
  const player1Impact = isBallHittingRacket(
    game.player1RacketPosition,
    game.player1RacketVelocity,
    game.ballPosition,
    game.ballDirection,
  );
  if (player1Impact.hit) {
    game.ballDirection.x *= -1; // Rebond horizontal
    game.ballDirection.y = player1Impact.newDirectionY; // Appliquer la nouvelle direction
    game.ballVelocity *= 1.05; // Augmenter légèrement la vitesse
  }

  // Vérification collision avec la raquette du joueur 2
  const player2Impact = isBallHittingRacket(
    game.player2RacketPosition,
    game.player2RacketVelocity,
    game.ballPosition,
    game.ballDirection,
  );
  if (player2Impact.hit) {
    game.ballDirection.x *= -1;
    game.ballDirection.y = player2Impact.newDirectionY;
    game.ballVelocity *= 1.05;
  }
}

function checkRacketCollision(game: PongDocument) {
  if (game.ballPosition.x <= 5) {
    // Collision avec la raquette gauche
    if (
      isBallHittingRacket(
        game.player1RacketPosition,
        game.player1RacketVelocity,
        game.ballPosition,
        game.ballDirection,
      )
    ) {
      game.ballDirection.x *= -1; // Rebond
    }
  }

  if (game.ballPosition.x >= fieldSize.x - 5) {
    // Collision raquette droite
    if (
      isBallHittingRacket(
        game.player2RacketPosition,
        game.player2RacketVelocity,
        game.ballPosition,
        game.ballDirection,
      )
    ) {
      game.ballDirection.x *= -1; // Rebond
    }
  }
}

function checkScore(game: PongDocument) {
  if (game.ballPosition.x < 0) {
    game.winner = 2;
    game.isFinished = true;
  } else if (game.ballPosition.x > fieldSize.x) {
    game.winner = 1;
    game.isFinished = true;
  }
}

function isBallHittingRacket(
  racketPosition: Position,
  racketVelocity: number, // Ajout de la vitesse de la raquette
  ballPosition: Position,
  ballDirection: { x: number; y: number },
): { hit: boolean; newDirectionY: number } {
  const racketHeight = 100; // Hauteur de la raquette
  const racketWidth = 10; // Largeur de la raquette
  const ballRadius = 5; // Rayon de la balle

  // Déterminer les limites de la raquette
  const racketTop = racketPosition.y - racketHeight / 2;
  const racketBottom = racketPosition.y + racketHeight / 2;
  const racketLeft = racketPosition.x - racketWidth / 2;
  const racketRight = racketPosition.x + racketWidth / 2;

  // Vérifier si la balle est en contact avec la raquette
  const ballLeft = ballPosition.x - ballRadius;
  const ballRight = ballPosition.x + ballRadius;
  const ballTop = ballPosition.y - ballRadius;
  const ballBottom = ballPosition.y + ballRadius;

  const hit =
    ballRight >= racketLeft &&
    ballLeft <= racketRight &&
    ballBottom >= racketTop &&
    ballTop <= racketBottom;

  if (!hit) {
    return { hit: false, newDirectionY: ballDirection.y };
  }

  // Calcul de l'angle de rebond basé sur l'impact de la balle
  const impact = (ballPosition.y - racketPosition.y) / (racketHeight / 2); // Normalisé entre -1 et 1
  let newDirectionY = impact * 1.5; // Plus on touche sur les bords, plus l'angle est fort

  // Ajout de l'effet de spin basé sur la vitesse de la raquette
  newDirectionY += racketVelocity * 0.1;

  // On s'assure que la nouvelle direction Y est dans une plage acceptable
  newDirectionY = Math.max(-1, Math.min(1, newDirectionY));

  return { hit: true, newDirectionY };
}
