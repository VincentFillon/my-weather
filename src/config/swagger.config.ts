import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const socketUrl = `${process.env.PRODUCTION === 'true' ? 'wss' : 'ws'}://${process.env.HOSTNAME}:${process.env.PORT}`;

  const config = new DocumentBuilder()
    .setTitle('Meteo API')
    .setDescription(
      'API Documentation including REST endpoints and WebSocket events',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', "Endpoints d'authentification")
    .addTag(
      'Mood WebSocket',
      'Événements WebSocket pour la gestion des humeurs',
    )
    .addTag(
      'User WebSocket',
      'Événements WebSocket pour la gestion des utilisateurs',
    )
    .addServer(socketUrl, 'WebSocket Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Ajouter manuellement la documentation WebSocket
  document.components.schemas['MoodWebSocketEvents'] = {
    type: 'object',
    properties: {
      createMood: {
        type: 'object',
        description: 'Créer une nouvelle humeur (ADMIN uniquement)',
        properties: {
          event: { type: 'string', example: 'createMood' },
          data: { $ref: '#/components/schemas/CreateMoodDto' },
        },
      },
      findAllMood: {
        type: 'object',
        description: 'Récupérer toutes les humeurs',
        properties: {
          event: { type: 'string', example: 'findAllMood' },
        },
      },
      updateMood: {
        type: 'object',
        description: 'Mettre à jour une humeur (ADMIN uniquement)',
        properties: {
          event: { type: 'string', example: 'updateMood' },
          data: { $ref: '#/components/schemas/UpdateMoodDto' },
        },
      },
      removeMood: {
        type: 'object',
        description: 'Supprimer une humeur (ADMIN uniquement)',
        properties: {
          event: { type: 'string', example: 'removeMood' },
          data: { type: 'string', example: '507f1f77bcf86cd799439011' },
        },
      },
    },
  };

  document.components.schemas['UserWebSocketEvents'] = {
    type: 'object',
    properties: {
      updateUserMood: {
        type: 'object',
        description: "Mettre à jour l'humeur d'un utilisateur",
        properties: {
          event: { type: 'string', example: 'updateUserMood' },
          data: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              mood: { type: 'string', example: '507f1f77bcf86cd799439012' },
            },
          },
        },
      },
      findAllUser: {
        type: 'object',
        description: 'Récupérer tous les utilisateurs',
        properties: {
          event: { type: 'string', example: 'findAllUser' },
        },
      },
    },
  };

  // Ajouter la section WebSocket dans la documentation
  document.paths['/websocket'] = {
    get: {
      tags: ['WebSocket'],
      summary: 'WebSocket Connection',
      description: `Connect to WebSocket server. Use ${socketUrl} as the WebSocket URL`,
      responses: {
        '101': {
          description: 'WebSocket connection established',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mood: {
                    $ref: '#/components/schemas/MoodWebSocketEvents',
                  },
                  user: {
                    $ref: '#/components/schemas/UserWebSocketEvents',
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  SwaggerModule.setup('docs', app, document);
}
