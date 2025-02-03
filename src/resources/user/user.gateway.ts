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
  async remove(@MessageBody() id: string, @ConnectedSocket() socket: Socket) {
    const user = (socket as any).user;
    if (user.sub !== id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    const deletedUser = await this.userService.remove(id);
    this.server.emit('userRemoved', id);
    return deletedUser;
  }
}
