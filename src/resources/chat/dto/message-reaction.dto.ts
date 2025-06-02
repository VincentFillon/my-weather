import { IsNotEmpty } from 'class-validator';

export class MessageReactionDto {
  @IsNotEmpty()
  messageId: string;
  @IsNotEmpty()
  emoji: string;
}
