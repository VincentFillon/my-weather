import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { JwtStrategy } from 'src/config/jwt.strategy';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthModule } from 'src/resources/auth/auth.module';
import { ChatModule } from 'src/resources/chat/chat.module';
import { MoodModule } from 'src/resources/mood/mood.module';
import { PollModule } from 'src/resources/poll/poll.module';
import { PongModule } from 'src/resources/pong/pong.module';
import { PublicHolidaysModule } from 'src/resources/public-holidays/public-holidays.module';
import { TicTacToeModule } from 'src/resources/tic-tac-toe/tic-tac-toe.module';
import { UploadModule } from 'src/resources/upload/upload.module';
import { UserHistoryModule } from 'src/resources/user-history/user-history.module';
import { UserModule } from 'src/resources/user/user.module';
import { TasksService } from 'src/tasks/tasks.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DATABASE}`,
    ),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'data'),
      serveRoot: `/${process.env.API_PREFIX}/data`,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    MoodModule,
    UserModule,
    UserHistoryModule,
    UploadModule,
    TicTacToeModule,
    PongModule,
    PublicHolidaysModule,
    ChatModule,
    PollModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    TasksService,
  ],
  exports: [JwtModule],
})
export class AppModule {}
