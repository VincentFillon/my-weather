import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    options.cors = { origin: true };
    options.path = `/${process.env.API_PREFIX}`;
    const server = super.createIOServer(port, options);
    return server;
  }
}
