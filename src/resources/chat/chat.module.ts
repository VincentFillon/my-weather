import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from 'src/resources/chat/chat.controller';
import { ChatGateway } from 'src/resources/chat/chat.gateway';
import { ChatService } from 'src/resources/chat/chat.service';
import {
  Message,
  MessageSchema,
} from 'src/resources/chat/entities/message.entity';
import {
  ReadStatus,
  ReadStatusSchema,
} from 'src/resources/chat/entities/read-status.entity';
import { Room, RoomSchema } from 'src/resources/chat/entities/room.entity';
import { UserModule } from 'src/resources/user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Message.name, schema: MessageSchema },
      { name: ReadStatus.name, schema: ReadStatusSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
    NotificationModule,
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
