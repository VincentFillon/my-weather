import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (context.getType() === 'http') {
      return this.validateHttpRequest(
        context.switchToHttp().getRequest<Request>(),
      );
    } else if (context.getType() === 'ws') {
      return this.validateWsRequest(context.switchToWs().getClient());
    }
    return false;
  }

  private validateHttpRequest(request: Request): boolean {
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      return false;
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      request['user'] = payload;
    } catch {
      return false;
    }
    return true;
  }

  private validateWsRequest(client: any): boolean {
    const token = this.extractTokenFromWs(client);
    if (!token) {
      throw new WsException('Unauthorized');
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      client['user'] = payload;
    } catch {
      throw new WsException('Unauthorized');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromWs(client: any): string | undefined {
    const token = client.handshake?.headers?.authorization;
    return token;
  }
}
