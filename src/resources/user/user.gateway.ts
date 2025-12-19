import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { User } from 'src/resources/user/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';
import { NotificationService } from '../notification/notification.service';

@ApiTags('User WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class UserGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('createUser')
  @ApiOperation({
    summary: 'Créer un nouvel utilisateur',
    description: 'Permet à un administrateur de créer un nouvel utilisateur',
  })
  async create(@MessageBody() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    this.server.emit('userCreated', user);
    return user;
  }

  @SubscribeMessage('findAllUser')
  @ApiOperation({
    summary: 'Récupérer tous les utilisateurs',
    description: 'Retourne la liste de tous les utilisateurs',
  })
  async findAll() {
    const users = await this.userService.findAll();
    this.server.emit('usersFound', users);
    return users;
  }

  @SubscribeMessage('findOneUser')
  @ApiOperation({
    summary: 'Récupérer un utilisateur spécifique',
    description: "Retourne les détails d'un utilisateur à partir de son ID",
  })
  async findOne(@MessageBody() id: string) {
    const user = await this.userService.findOne(id);
    this.server.emit('userFound', user);
    return user;
  }

  @SubscribeMessage('updateUser')
  @ApiOperation({
    summary: 'Mettre à jour un utilisateur',
    description: 'Permet à un utilisateur de mettre à jour son profil',
  })
  async updateUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() user: UpdateUserDto,
  ) {
    const currentUser = (socket as any).user;
    if (currentUser.sub !== user._id && currentUser.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }

    let currentUserEntity: User | null = null;
    if (currentUser.sub !== user._id)
      currentUserEntity = await this.findOne(currentUser.sub);

    const updatedUser = await this.userService.update(
      user._id,
      user,
      currentUserEntity,
    );
    this.server.emit('userUpdated', updatedUser);
    return updatedUser;
  }

  @SubscribeMessage('updateUserMood')
  @ApiOperation({
    summary: "Mettre à jour l'humeur d'un utilisateur",
    description:
      "Permet à un utilisateur de changer son humeur actuelle, ou à un administrateur de changer l'humeur de n'importe quel utilisateur",
  })
  async updateMood(
    @ConnectedSocket() socket: Socket,
    @MessageBody() updateUserDto: UpdateUserDto,
  ) {
    const user = (socket as any).user;
    if (user.sub !== updateUserDto._id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }

    let currentUserEntity: User | null = null;
    if (user.sub !== user._id) currentUserEntity = await this.findOne(user.sub);

    const previousUser = await this.findOne(updateUserDto._id);
    // Si l'humeur de l'utilisateur n'a pas changé, on ne fait rien
    if (
      !updateUserDto.mood ||
      `${updateUserDto.mood._id}` === previousUser.mood?._id.toString()
    )
      return previousUser;

    const updatedUser = await this.userService.update(
      updateUserDto._id,
      updateUserDto,
      currentUserEntity,
    );
    this.server.emit('userMoodUpdated', updatedUser);

    // Send Push Notification
    const payload = {
      notification: {
        title: "Changement d'humeur",
        body: `${updatedUser.displayName} est maintenant dans ${updatedUser.mood?.name || 'la zone neutre'}`,
        icon: updatedUser.mood?.image || 'assets/icons/icon-192x192.png',
        data: { url: '/board' }
      }
    };
    this.notificationService.sendNotificationToAll(payload, updatedUser._id.toString());

    return updatedUser;
  }

  @SubscribeMessage('removeUser')
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description:
      "Permet à un utilisateur de supprimer son compte, ou à un administrateur de supprimer n'importe quel compte",
  })
  async remove(@MessageBody() id: string, @ConnectedSocket() socket: Socket) {
    const user = (socket as any).user;
    if (user.sub !== id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    const deletedUser = await this.userService.remove(id);
    this.server.emit('userRemoved', id);
    return deletedUser;
  }

  @SubscribeMessage('selectFrame')
  @ApiOperation({
    summary: 'Sélectionner un cadre',
    description: 'Permet à un utilisateur de sélectionner un cadre pour son avatar',
  })
  async selectFrame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() frameId: string,
  ) {
    const user = (socket as any).user;
    const updatedUser = await this.userService.selectFrame(user.sub, frameId);
    this.server.emit('userFrameSelected', updatedUser);
    return updatedUser;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('createFrame')
  @ApiOperation({
    summary: 'Créer un cadre',
    description: 'Permet à un administrateur de créer un cadre',
  })
  async createFrame(@MessageBody() createFrameDto: CreateFrameDto) {
    const frame = await this.userService.createFrame(createFrameDto);
    this.server.emit('frameCreated', frame);
    return frame;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('updateFrame')
  @ApiOperation({
    summary: 'Mettre à jour un cadre',
    description: 'Permet à un administrateur de mettre à jour un cadre',
  })
  async updateFrame(@MessageBody() updateFrameDto: UpdateFrameDto) {
    const frame = await this.userService.updateFrame(
      updateFrameDto._id,
      updateFrameDto,
    );
    this.server.emit('frameUpdated', frame);
    return frame;
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('deleteFrame')
  @ApiOperation({
    summary: 'Supprimer un cadre',
    description: 'Permet à un administrateur de supprimer un cadre',
  })
  async deleteFrame(@MessageBody() id: string) {
    const frame = await this.userService.deleteFrame(id);
    this.server.emit('frameDeleted', id);
    return frame;
  }

  @SubscribeMessage('findAllFrames')
  @ApiOperation({
    summary: 'Récupérer tous les cadres',
    description: 'Retourne la liste de tous les cadres',
  })
  async findAllFrames() {
    const frames = await this.userService.getAllFrames();
    this.server.emit('framesFound', frames);
    return frames;
  }
}
