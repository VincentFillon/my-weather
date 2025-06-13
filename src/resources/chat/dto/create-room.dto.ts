import { IsArray, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsArray()
  @IsNotEmpty({ each: true })
  userIds: string[];

  @IsOptional()
  isChatBot?: boolean;
}
