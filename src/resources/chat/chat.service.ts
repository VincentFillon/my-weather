import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateRoomDto } from 'src/resources/chat/dto/create-room.dto';
import { JoinRoomDto } from 'src/resources/chat/dto/join-room.dto';
import { SendMessageDto } from 'src/resources/chat/dto/send-message.dto';
import { UpdateRoomDto } from 'src/resources/chat/dto/update-room.dto';
import {
  Message,
  MessageDocument,
} from 'src/resources/chat/entities/message.entity';
import {
  ReadStatus,
  ReadStatusDocument,
} from 'src/resources/chat/entities/read-status.entity';
import { Room, RoomDocument } from 'src/resources/chat/entities/room.entity';
import { UserService } from 'src/resources/user/user.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(ReadStatus.name)
    private readStatusModel: Model<ReadStatusDocument>,
    private userService: UserService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto, creatorId: string): Promise<Room> {
    const creator = await this.userService.findOne(creatorId);
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Ensure creator is part of the users list
    const userIdsWithCreator = Array.from(new Set([...createRoomDto.userIds, creatorId]));

    const users = await this.userService.findMany(userIdsWithCreator);
    if (!createRoomDto.isChatBot && users.length < 2 && userIdsWithCreator.length < 2) { // Also check original list length in case of duplicate creatorId
      throw new BadRequestException(
        'At least two users (including the creator) are required to create a room',
      );
    }

    const roomData = {
      name: createRoomDto.name,
      image: createRoomDto.image,
      users: users,
      isChatBot: createRoomDto.isChatBot || false, // Default to false if not provided
      creator: creator, // Assign the creator object
    };

    const room = new this.roomModel(roomData);
    await room.save();
    return this.roomModel.findById(room._id).populate('users').populate('creator').exec();
  }

  async findOne(roomId: string): Promise<Room> {
    return this.roomModel.findById(roomId).populate('users').populate('creator').exec();
  }

  async findByUser(userId: string): Promise<Room[]> {
    return this.roomModel
      .find({ users: { $in: [userId] } })
      .populate('users')
      .exec();
  }

  async findMessagesPaginated(
    roomId: string,
    limit: number = 30, // Valeur par défaut
    beforeDate?: Date, // Date du message le plus ancien actuellement chargé
  ): Promise<MessageDocument[]> {
    const query: any = { room: new Types.ObjectId(roomId) };

    if (beforeDate) {
      query.createdAt = { $lt: beforeDate }; // Chercher les messages PLUS ANCIENS que cette date
    }

    return this.messageModel
      .find(query)
      .sort({ createdAt: -1 }) // Trier par date décroissante (plus récent en premier)
      .limit(limit) // Appliquer la limite
      .populate({
        path: 'sender',
        select: 'displayName image _id selectedFrame',
        populate: { path: 'selectedFrame' },
      }) // Peupler l'expéditeur
      .exec();

    // Note: On renvoie les messages du plus récent au plus ancien (dans la page chargée)
    // Le frontend devra les inverser ou les préfixer correctement.
    // Alternative: trier par createdAt: 1 (ASC) et utiliser $gt pour la date.
  }

  async joinRoom(joinRoomDto: JoinRoomDto): Promise<Room> {
    const room = await this.roomModel
      .findById(joinRoomDto.roomId)
      .populate('users')
      .populate('creator')
      .exec();
    if (!room) throw new NotFoundException('Room not found');

    if (
      !room.users.some((user) => user._id.toString() === joinRoomDto.userId)
    ) {
      const user = await this.userService.findOne(joinRoomDto.userId);
      if (!user) throw new NotFoundException('User not found');
      room.users.push(user);
      await room.save();
    }
    return room;
  }

  async findMessagesByRoom(roomId: string): Promise<Message[]> {
    return this.messageModel
      .find({ room: new Types.ObjectId(roomId) })
      .populate({
        path: 'sender',
        populate: { path: 'selectedFrame' },
      })
      .exec();
  }

  async findLastMessageByRoom(roomId: string): Promise<Message> {
    return this.messageModel
      .findOne({ room: new Types.ObjectId(roomId) })
      .populate({
        path: 'sender',
        populate: { path: 'selectedFrame' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countUnreadMessagesByRoom(
    roomId: string,
    userId: string,
  ): Promise<number> {
    const roomIdObj = new Types.ObjectId(roomId);
    const userIdObj = new Types.ObjectId(userId);

    const readStatus = await this.readStatusModel.findOne({
      roomId: roomIdObj,
      userId: userIdObj,
    });
    if (readStatus && readStatus.lastReadTimestamp) {
      return this.messageModel.countDocuments({
        room: roomIdObj,
        sender: { $ne: userIdObj }, // Ne pas compter ses propres messages comme non lus
        createdAt: { $gt: readStatus.lastReadTimestamp },
      });
    }
    return 0;
  }

  async markRoomAsRead(
    userId: string,
    roomId: string,
    readTimestamp: Date,
  ): Promise<ReadStatus> {
    const userIdObj = new Types.ObjectId(userId);
    const roomIdObj = new Types.ObjectId(roomId);

    // Utilise findOneAndUpdate avec upsert: true pour créer ou mettre à jour l'entrée
    const updatedStatus = await this.readStatusModel
      .findOneAndUpdate(
        { userId: userIdObj, roomId: roomIdObj },
        {
          $set: {
            lastReadTimestamp: readTimestamp,
            userId: userIdObj,
            roomId: roomIdObj,
          },
        }, // Assure que userId/roomId sont bien présents si upsert crée le doc
        { new: true, upsert: true }, // new: true renvoie le doc mis à jour/créé
      )
      .exec();

    return updatedStatus;
  }

  async leaveRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.roomModel.findById(roomId).populate('users').populate('creator').exec();
    if (!room) throw new NotFoundException('Room not found');

    room.users = room.users.filter((user) => user._id.toString() !== userId);
    await room.save();
    return room;
  }

  async sendMessage(sendMessageDto: SendMessageDto): Promise<Message> {
    const message = new this.messageModel(sendMessageDto);
    await message.save();
    return this.messageModel
      .findById(message._id)
      .populate({
        path: 'sender',
        populate: { path: 'selectedFrame' },
      })
      .exec();
  }
  /**
   * Ajoute une réaction emoji à un message.
   */
  async addReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    const typedUserId = new Types.ObjectId(userId);

    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    console.log(`[ChatService] addReaction: messageId=${messageId}, emoji=${emoji}, userId=${userId}, reactionIndex=${reactionIndex}`);

    if (reactionIndex === -1) {
      // Première fois qu'on utilise cet émoji sur ce message
      message.reactions.push({ emoji, userIds: [typedUserId] });
    } else if (
      !message.reactions[reactionIndex].userIds.some((id) =>
        id.equals(typedUserId),
      )
    ) {
      message.reactions[reactionIndex].userIds.push(typedUserId);
    }
    message.markModified('reactions');
    await message.save();
    return this.messageModel
      .findById(messageId)
      .populate({
        path: 'sender',
        populate: { path: 'selectedFrame' },
      })
      .exec();
  }

  /**
   * Retire une réaction emoji à un message pour un utilisateur.
   */
  async removeReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    const typedUserId = new Types.ObjectId(userId);

    // console.debug(message.reactions);
    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
    if (reactionIndex !== -1) {
      const idx = message.reactions[reactionIndex].userIds.findIndex((id) =>
        id.equals(typedUserId),
      );
      if (idx !== -1) {
        message.reactions[reactionIndex].userIds.splice(idx, 1);
        // Si plus personne n'a cette réaction, on l'enlève du tableau
        if (message.reactions[reactionIndex].userIds.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
        message.markModified('reactions');
        // console.debug(message.reactions);
        await message.save();
      }
    }
    return this.messageModel
      .findById(messageId)
      .populate({
        path: 'sender',
        populate: { path: 'selectedFrame' },
      })
      .exec();
  }

  async updateRoom(updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomModel.findById(updateRoomDto.roomId).populate('creator').populate('users').populate('creator').exec();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (updateRoomDto.name) {
      room.name = updateRoomDto.name;
    }

    if (updateRoomDto.image) {
      room.image = updateRoomDto.image;
    }

    if (updateRoomDto.userIds) {
      // Ensure the creator is always in the list of users and cannot be removed.
      const creatorIdString = room.creator._id.toString();
      if (!updateRoomDto.userIds.includes(creatorIdString)) {
        updateRoomDto.userIds.push(creatorIdString);
      }

      // Prevent room from having less than 1 user (the creator)
      if (updateRoomDto.userIds.length === 0) {
          throw new BadRequestException('A room must have at least one user (the creator).');
      }

      const users = await this.userService.findMany(updateRoomDto.userIds);
      if (users.length !== updateRoomDto.userIds.length) {
        // This could happen if some userIds are invalid
        throw new BadRequestException('One or more user IDs are invalid.');
      }
      room.users = users;
    }

    await room.save();
    // Repopulate to ensure all fields are fresh, especially if users were modified by ID.
    return this.roomModel.findById(room._id).populate('users').populate('creator').exec();
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.roomModel.findByIdAndDelete(roomId);
    await this.messageModel.deleteMany({ room: roomId });
  }
}
