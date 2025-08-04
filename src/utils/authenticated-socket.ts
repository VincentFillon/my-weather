import { Socket } from 'socket.io';
import { Role } from 'src/resources/auth/enums/role.enum';

export interface AuthenticatedSocket extends Socket {
  user: {
    username: string,
    sub: string,
    role: Role,
    activeGroup: string,
  };
}