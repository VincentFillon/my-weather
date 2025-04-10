import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ChatService } from 'src/resources/chat/chat.service';
import { Message } from './entities/message.entity';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms/:roomId/messages')
  @UseGuards(JwtAuthGuard) // Protéger la route
  @ApiOkResponse({
    description: 'Paginated list of messages for a room.',
    type: [Message],
  })
  async getMessagesPaginated(
    @Request() req,
    @Param('roomId') roomId: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('before') before?: string,
  ): Promise<Message[]> {
    // Renvoyer des objets simples
    const currentUserId = req.user.sub;

    // Vérifier si currentUserId a accès à roomId (est membre)
    const room = await this.chatService.findOne(roomId); // Peut être optimisé pour juste vérifier l'existence et l'appartenance
    if (
      !room ||
      !room.users.some((user) => user._id.toString() === currentUserId)
    ) {
      throw new ForbiddenException('Access denied to this room');
    }

    let beforeDate: Date | undefined = undefined;
    if (before) {
      beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        throw new BadRequestException(
          'Invalid "before" date format. Use ISO 8601.',
        );
      }
    }

    const messages = await this.chatService.findMessagesPaginated(
      roomId,
      limit,
      beforeDate,
    );
    // Convertir en objets simples avant de renvoyer
    return messages.map((msg) => msg.toObject());
  }
}
