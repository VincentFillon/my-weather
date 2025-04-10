import { IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @IsNotEmpty()
  roomId: string;
  @IsNotEmpty()
  lastMessageTimestamp: string;
}
