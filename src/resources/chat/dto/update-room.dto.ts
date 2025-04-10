import { IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class UpdateRoomDto {
  @IsNotEmpty()
  roomId: string;
  @IsOptional()
  @IsNotEmpty()
  name?: string;
  @IsOptional()
  @IsUrl()
  image?: string;
}
