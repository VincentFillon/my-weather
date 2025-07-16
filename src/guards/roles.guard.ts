import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { Role } from 'src/resources/auth/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const req =
      context.getType() === 'ws'
        ? context.switchToWs().getClient()
        : context.switchToHttp().getRequest();

    // console.debug(req);

    const hasGlobalRole = requiredRoles.some(
      (role) => req.user.role === role,
    );
    if (hasGlobalRole) {
      return true;
    }

    if (!req.user.activeGroup) {
      return false;
    }

    const groupRole = req.user.memberships.find(
      (m) => m.group.toString() === req.user.activeGroup.toString(),
    )?.role;

    if (!groupRole) {
      return false;
    }

    return requiredRoles.some((role) => groupRole === role);
  }
}
