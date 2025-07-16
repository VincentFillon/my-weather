import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { User } from '../user/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto';
import { GroupService } from './group.service';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
  create(@Body() createGroupDto: CreateGroupDto, @GetUser() user: User) {
    return this.groupService.create(createGroupDto, user);
  }

  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Patch(':id/members')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateMember(
    @Param('id') id: string,
    @Body() updateGroupMemberDto: UpdateGroupMemberDto,
  ) {
    return this.groupService.updateMember(id, updateGroupMemberDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groupService.removeMember(id, userId);
  }
}