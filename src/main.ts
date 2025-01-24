import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SocketIoAdapter } from 'src/config/socket-io.adapter';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  setupSwagger(app);

  // app.setGlobalPrefix(process.env.API_PREFIX, {
  //   exclude: ['/'],
  // });

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.enableCors({
    origin: (
      requestOrigin: string,
      callback: (err: Error | null, origin?: string) => void,
    ) => {
      callback(null, requestOrigin);
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
