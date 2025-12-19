import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ChatService } from 'src/resources/chat/chat.service';
import { CreateRoomDto } from 'src/resources/chat/dto/create-room.dto';
import { JoinRoomDto } from 'src/resources/chat/dto/join-room.dto';
import { MarkAsReadDto } from 'src/resources/chat/dto/mark-as-read.dto';
import { MessageReactionDto } from 'src/resources/chat/dto/message-reaction.dto';
import { SendMessageDto } from 'src/resources/chat/dto/send-message.dto';
import { UpdateRoomDto } from 'src/resources/chat/dto/update-room.dto';
import { RoomDocument } from 'src/resources/chat/entities/room.entity';
import { NotificationService } from '../notification/notification.service';

@ApiTags('Chat WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.headers?.authorization;
      if (token) {
        const user = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        if (user && user.sub) {
          // Joindre la room personnelle de l'utilisateur
          client.join(`user_${user.sub}`);
          this.logger.log(
            `Utilisateur ${user.sub} connecté à la socket ${client.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error during connection:', error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    const userId = user ? user.sub : 'inconnu';
    console.log(`[Chat WS] Client déconnecté: ${client.id} (User: ${userId})`);
    // Socket.IO gère automatiquement le 'leave' des rooms lors de la déconnexion
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @MessageBody() createRoomDto: CreateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) throw new UnauthorizedException();

    // S'assurer que le créateur est inclus dans la liste des users
    if (!createRoomDto.userIds.includes(currentUser.sub)) {
      createRoomDto.userIds.push(currentUser.sub);
    }

    const room = await this.chatService.createRoom(
      createRoomDto,
      currentUser.sub,
    );

    // Notifier tous les membres (y compris le créateur) via leur room personnelle
    room.users.forEach((user) => {
      this.server.to(`user_${user._id.toString()}`).emit('roomCreated', room);
    });

    return room;
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() joinRoomDto: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    let room = await this.chatService.findOne(joinRoomDto.roomId);

    if (room.creator._id.toString() !== currentUser.sub) {
      throw new ForbiddenException();
    }

    room = await this.chatService.joinRoom(joinRoomDto);

    // Notifier tous les membres via leur room personnelle
    room.users.forEach((user) => {
      this.server.to(`user_${user._id.toString()}`).emit('roomUpdated', room);
    });
    return room;
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    const room = await this.chatService.leaveRoom(roomId, currentUser.sub);

    // Notifier tous les membres via leur room personnelle
    room.users.forEach((user) => {
      this.server.to(`user_${user._id.toString()}`).emit('roomUpdated', room);
    });
    return room;
  }

  @SubscribeMessage('removeUser')
  async handleExpelUser(
    @MessageBody() expelUserDto: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const room = await this.chatService.findOne(expelUserDto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.creator._id.toString() !== currentUser.sub) {
      throw new ForbiddenException();
    }

    const updatedRoom = await this.chatService.leaveRoom(
      expelUserDto.roomId,
      expelUserDto.userId,
    );

    // Notifier tous les membres via leur room personnelle
    updatedRoom.users.forEach((user) => {
      if (user._id.toString() === expelUserDto.userId) {
        this.server
          .to(`user_${user._id.toString()}`)
          .emit('removeddFromRoom', expelUserDto.roomId);
      } else {
        this.server
          .to(`user_${user._id.toString()}`)
          .emit('roomUpdated', updatedRoom);
      }
    });

    return updatedRoom;
  }

  @SubscribeMessage('updateRoom')
  async handleUpdateRoom(
    @MessageBody() updateRoomDto: UpdateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const room = await this.chatService.findOne(updateRoomDto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.creator._id.toString() !== currentUser.sub) {
      throw new ForbiddenException();
    }

    const updatedRoom = await this.chatService.updateRoom(updateRoomDto);

    // Notifier tous les membres via leur room personnelle
    updatedRoom.users.forEach((user) => {
      this.server
        .to(`user_${user._id.toString()}`)
        .emit('roomUpdated', updatedRoom);
    });

    return updatedRoom;
  }

  @SubscribeMessage('subscribeToRoom')
  handleSubscribeToRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const user = (client as any).user;
    if (!user || !user.sub) throw new UnauthorizedException();

    console.log(`[Chat WS] User ${user.sub} s'abonne à la room ${data.roomId}`);
    client.join(`chat_${data.roomId}`);
    // Optionnel: Renvoyer une confirmation
    // client.emit('subscribed', { roomId: data.roomId });
  }

  @SubscribeMessage('unsubscribeFromRoom')
  handleUnsubscribeFromRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const user = (client as any).user;
    if (!user || !user.sub) throw new UnauthorizedException();

    console.log(
      `[Chat WS] User ${user.sub} se désabonne de la room ${data.roomId}`,
    );
    client.leave(`chat_${data.roomId}`);
    // Optionnel: Renvoyer une confirmation
    // client.emit('unsubscribed', { roomId: data.roomId });
  }

  @SubscribeMessage('getMyRooms')
  async handleGetMyRooms(@ConnectedSocket() client: Socket) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const rooms = await this.chatService.findByUser(currentUser.sub);

    const enrichedRooms = await Promise.all(
      rooms.map(async (room: RoomDocument) => {
        const [lastMessage, unreadCount] = await Promise.all([
          this.chatService.findLastMessageByRoom(room._id.toString()),
          this.chatService.countUnreadMessagesByRoom(room._id.toString(), currentUser.sub),
        ]);
        return {
          ...room.toObject(),
          lastMessage: lastMessage ?? null,
          unreadCount: unreadCount ?? 0,
        };
      }),
    );

    this.server.to(`user_${currentUser.sub}`).emit('myRoomsList', enrichedRooms);
    return enrichedRooms;
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Ou renvoyer le statut mis à jour si besoin
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    // Utiliser la date envoyée par le client si fournie et valide, sinon la date actuelle
    const readTimestamp = data.lastMessageTimestamp
      ? new Date(data.lastMessageTimestamp)
      : new Date();
    if (isNaN(readTimestamp.getTime())) {
      this.logger.warn(
        `Timestamp invalide pour markAsRead: ${data.lastMessageTimestamp}. Utilisation du timestamp actuelle.`,
      );
      readTimestamp.setTime(new Date().getTime());
    }

    try {
      await this.chatService.markRoomAsRead(
        currentUser.sub,
        data.roomId,
        readTimestamp,
      );
    } catch (error) {
      this.logger.error(
        `Echec de la mise à jour du statut de lecture pour la room ${data.roomId} pour l'utilisateur ${currentUser.sub}:`,
        error,
      );
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() sendMessageDto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    // Validation: content ou mediaUrl doit être présent
    if (!sendMessageDto.content && !sendMessageDto.mediaUrl) {
      throw new BadRequestException(
        'Un message doit contenir du texte ou un média.',
      );
    }

    const room = await this.chatService.findOne(sendMessageDto.room);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (!room.users.some((user) => user._id.toString() === currentUser.sub)) {
      throw new ForbiddenException();
    }

    // Assigner le sender au DTO, car il est validé mais pas nécessairement inclus dans le body par le client
    sendMessageDto.sender = currentUser.sub;

    const message = await this.chatService.sendMessage(sendMessageDto);
    const roomId = message.room.toString();

    // 1. Diffuser à ceux qui ont le panneau OUVERT (Room Socket.IO spécifique)
    this.server.to(`chat_${roomId}`).emit('messageSent', message);

    // 2. Envoyer une notification aux autres membres de la room (via leur room personnelle)
    room.users.forEach((user) => {
      const userIdStr = user._id.toString();
      if (userIdStr !== currentUser.sub) {
        // Ne pas notifier l'envoyeur
        this.server.to(`user_${userIdStr}`).emit('newMessageNotification', {
            roomId,
            message,
        });

        // Send Push Notification
        const senderName = message.sender ? message.sender.displayName : 'Quelqu\'un';
        const notificationTitle = room.users.length > 2 ? `${senderName} (dans ${room.name})` : senderName;

        const payload = {
            notification: {
                title: notificationTitle,
                body: message.content || 'A envoyé un média',
                icon: (message.sender && message.sender.image) ? message.sender.image : 'assets/icons/icon-192x192.png',
                data: { url: `/chat/${roomId}` }
            }
        };
        this.notificationService.sendNotificationToUser(userIdStr, payload);
      }
    });

    return message;
  }

  @OnEvent('chat.bot.message')
  async handleBotMessage(payload: {
    to: string;
    content: string;
    botName: string;
  }) {
    // Vérifier si la room "ChatBot" existe pour cet utilisateur
    const userRooms = await this.chatService.findByUser(payload.to);
    let room = userRooms.find((r) => r.isChatBot && r.name === payload.botName);

    if (!room) {
      // Si la room n'existe pas, la créer
      room = await this.chatService.createRoom(
        {
          name: payload.botName,
          userIds: [payload.to],
          isChatBot: true,
        },
        payload.to,
      );

      this.server.to(`user_${payload.to}`).emit('roomCreated', room);
    }

    const roomId = room._id.toString();

    const message = await this.chatService.sendMessage({
      room: roomId,
      content: payload.content,
      sender: null,
    });

    this.server.to(`chat_${roomId}`).emit('messageSent', message);

    this.server.to(`user_${payload.to}`).emit('newMessageNotification', {
      roomId,
      message,
    });

    // Send Push Notification
    const pushPayload = {
        notification: {
            title: payload.botName,
            body: payload.content,
            icon: 'assets/bot-avatar.png',
            data: { url: `/chat/${roomId}` }
        }
    };
    this.notificationService.sendNotificationToUser(payload.to, pushPayload);
  }

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    this.logger.log(
      `[Chat WS] User ${currentUser.sub} ajoute une réaction sur le message ${data.messageId} avec l'emoji ${data.emoji}`,
    );

    const message = await this.chatService.addReaction(
      data.messageId,
      data.emoji,
      currentUser.sub,
    );

    this.logger.debug(message);

    // Diffuse le message mis à jour (avec reactions) à la room du message
    this.server
      .to(`chat_${message.room.toString()}`)
      .emit('messageUpdated', message);
    return message;
  }

  @SubscribeMessage('removeReaction')
  async handleRemoveReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }

    this.logger.log(
      `[Chat WS] User ${currentUser.sub} supprime une réaction sur le message ${data.messageId} avec l'emoji ${data.emoji}`,
    );

    const message = await this.chatService.removeReaction(
      data.messageId,
      data.emoji,
      currentUser.sub,
    );

    this.logger.debug(message);

    this.server
      .to(`chat_${message.room.toString()}`)
      .emit('messageUpdated', message);
    return message;
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const room = await this.chatService.findOne(data.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (!room.users.some((user) => user._id.toString() === currentUser.sub)) {
      throw new ForbiddenException();
    }

    const messages = await this.chatService.findMessagesByRoom(data.roomId);

    this.server.to(`chat_${data.roomId}`).emit('messagesList', messages);
    return messages;
  }

  @SubscribeMessage('deleteRoom')
  async handleDeleteRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = (client as any).user;
    if (!currentUser || !currentUser.sub) {
      throw new UnauthorizedException();
    }
    const room = await this.chatService.findOne(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.creator._id.toString() !== currentUser.sub) {
      throw new ForbiddenException();
    }

    await this.chatService.deleteRoom(roomId);
    this.server.emit('roomDeleted', { roomId });
  }
}
