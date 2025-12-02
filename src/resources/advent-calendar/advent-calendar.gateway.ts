import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AdventCalendarService } from './advent-calendar.service';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@WebSocketGateway({ cors: true })
@Injectable()
export class AdventCalendarGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly adventCalendarService: AdventCalendarService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization?.split(' ')[1];
      if (!token) return;

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const userId = payload.sub;

      const shouldNotify =
        await this.adventCalendarService.shouldNotifyUser(userId);

      if (shouldNotify) {
        client.emit('adventCalendarNotification', {
          message:
            "N'oubliez pas d'ouvrir votre case du calendrier de l'avent !",
        });
        await this.adventCalendarService.markUserNotified(userId);
      }
    } catch (e) {
      // Ignore invalid tokens or errors during connection check
    }
  }
}
