import { Request } from 'express';
import { Role } from 'src/resources/auth/enums/role.enum';

export interface AuthenticatedRequest extends Request {
  user: {
    username: string;
    sub: string;
    role: Role;
    activeGroup: string;
  };
}
