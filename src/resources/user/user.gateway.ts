import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { User } from 'src/resources/user/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@UseGuards(JwtAuthGuard)
@WebSocketGateway()
export class UserGateway {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @SubscribeMessage('createUser')
  create(@MessageBody() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @SubscribeMessage('findAllUser')
  findAll() {
    return this.userService.findAll();
  }

  @SubscribeMessage('findOneUser')
  findOne(@MessageBody() id: string) {
    return this.userService.findOne(id);
  }

  @SubscribeMessage('updateUser')
  update(
    @MessageBody() updateUserDto: UpdateUserDto,
    @ConnectedSocket() client: any,
  ) {
    const user = client.user as User;
    if (user._id.toString() !== updateUserDto._id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    // Si un utilisateur essaie de se promouvoir en tant qu'administrateur
    if (
      user.role !== Role.ADMIN &&
      user._id.toString() === updateUserDto._id &&
      updateUserDto.role === Role.ADMIN
    ) {
      throw new WsException('Forbidden');
    }
    return this.userService.update(updateUserDto._id, updateUserDto);
  }

  @SubscribeMessage('updateUserMood')
  updateMood(
    @MessageBody() updateUserDto: UpdateUserDto,
    @ConnectedSocket() client: any,
  ) {
    const user = client.user as User;
    if (user._id.toString() !== updateUserDto._id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    return this.userService.update(updateUserDto._id, updateUserDto);
  }

  @SubscribeMessage('removeUser')
  remove(@MessageBody() id: string, @ConnectedSocket() client: any) {
    const user = client.user as User;
    if (user._id.toString() !== id && user.role !== Role.ADMIN) {
      throw new WsException('Forbidden');
    }
    return this.userService.remove(id);
  }
}
