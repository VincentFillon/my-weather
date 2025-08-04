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
import { Server } from 'socket.io';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { User } from 'src/resources/user/entities/user.entity';
import { AuthenticatedSocket } from 'src/utils/authenticated-socket';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('User WebSocket')
@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class UserGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly userService: UserService) {}

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
  async findAll(@ConnectedSocket() client: AuthenticatedSocket) {
    const users = await this.userService.findAll(client.user.activeGroup);
    client.emit('usersFound', users);
    return users;
  }

  @SubscribeMessage('findOneUser')
  @ApiOperation({
    summary: 'Récupérer un utilisateur spécifique',
    description: "Retourne les détails d'un utilisateur à partir de son ID",
  })
  async findOne(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() id: string,
  ) {
    const user = await this.userService.findOne(id);
    client.emit('userFound', user);
    return user;
  }

  @SubscribeMessage('updateUser')
  @ApiOperation({
    summary: 'Mettre à jour un utilisateur',
    description: 'Permet à un utilisateur de mettre à jour son profil',
  })
  async updateUser(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() user: UpdateUserDto,
  ) {
    if (socket.user.sub !== user._id && socket.user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }

    let currentUserEntity: User | null = null;
    if (socket.user.sub !== user._id)
      currentUserEntity = await this.userService.findOne(socket.user.sub);

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
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() updateUserDto: UpdateUserDto,
  ) {
    if (
      socket.user.sub !== updateUserDto._id &&
      socket.user.role !== Role.ADMIN
    ) {
      throw new WsException('Forbidden');
    }

    let currentUserEntity: User | null = null;
    if (socket.user.sub !== updateUserDto._id)
      currentUserEntity = await this.userService.findOne(socket.user.sub);

    const previousUser = await this.userService.findOne(updateUserDto._id);
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
    return updatedUser;
  }

  @SubscribeMessage('removeUser')
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description:
      "Permet à un utilisateur de supprimer son compte, ou à un administrateur de supprimer n'importe quel compte",
  })
  async remove(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() id: string,
  ) {
    if (socket.user.sub !== id && socket.user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    const deletedUser = await this.userService.remove(id);
    this.server.emit('userRemoved', id);
    return deletedUser;
  }
}
