import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { GroupRole } from '../enums/group-role.enum';

export class UpdateGroupMemberDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(GroupRole)
  @IsNotEmpty()
  role: GroupRole;
}