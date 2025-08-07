import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { DailyHuntService } from './daily-hunt.service';

@UseGuards(JwtAuthGuard)
@WebSocketGateway({ cors: true })
export class DailyHuntGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly dailyHuntService: DailyHuntService,
    private readonly userService: UserService,
  ) {}

  @SubscribeMessage('getTodaysHunt')
  async getTodaysHunt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { full?: boolean },
  ) {
    const hunt = await this.dailyHuntService.getTodaysHunt();

    // Mode rétrocompatible (payload simple)
    if (!data?.full) {
      client.emit('todaysHunt', hunt);
      return;
    }

    // Récupérer l'utilisateur courant depuis le socket
    const userFromSocket = (client as any).user;
    const user = await this.userService.findOne(userFromSocket.sub);

    // Récupérer la liste des trouvailles du jour (avec user)
    const finds = await this.dailyHuntService.getTodaysFinds();

    const alreadyFound = finds.some(
      (f: any) => String(f.user?._id || f.user) === String(user._id),
    );

    const payload = {
      hunt: hunt
        ? {
            _id: hunt._id,
            date: hunt.date,
            positionX: hunt.positionX,
            positionY: hunt.positionY,
          }
        : null,
      finds: (finds || []).map((f: any) => ({
        user: {
          _id: String(f.user?._id || f.user),
          displayName: f.user?.displayName,
          image: f.user?.image,
        },
        rank: f.rank,
      })),
      alreadyFound,
    };

    client.emit('todaysHuntFull', payload);
  }

  @SubscribeMessage('foundHunt')
  async foundHunt(@ConnectedSocket() client: Socket) {
    const userFromSocket = (client as any).user;
    const user = await this.userService.findOne(userFromSocket.sub);
    const result = await this.dailyHuntService.findHunt(user);

    // Notify the user who found it
    client.emit('huntResult', result);

    // Notify everyone for potential leaderboard update
    if (result.message === 'Success') {
      this.server.emit('newHuntFind', {
        user: {
          _id: user._id,
          displayName: user.displayName,
          image: user.image,
        },
        rank: result.rank,
      });
    }
  }
}