import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateRoomDto {
  @IsNotEmpty()
  roomId: string;
  @IsOptional()
  @IsNotEmpty()
  name?: string;
  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
