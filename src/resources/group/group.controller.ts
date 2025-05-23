import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { Group } from 'src/resources/group/entities/group.entity';
import { GroupRole } from 'src/resources/group/enums/group-role.enum';
import { GroupService } from 'src/resources/group/group.service';
// import { JwtAuthGuard } from 'src/guards/jwt-auth.guard'; // A activer en prod

@Controller('groups')
// @UseGuards(JwtAuthGuard) // Sécuriser toutes les routes du contrôleur
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  async create(@Body() createGroupDto: Partial<Group>, @Request() req) {
    // req.user.userId (extrait du token JWT)
    return this.groupService.createGroup(createGroupDto, req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateGroupDto: Partial<Group>,
    @Request() req,
  ) {
    return this.groupService.updateGroup(id, updateGroupDto, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.groupService.deleteGroup(id, req.user.userId);
  }

  // Membres d'un groupe (routes pour admin)
  @Get(':id/members')
  async members(@Param('id') groupId: string) {
    return this.groupService.getMemberships(groupId);
  }

  @Post(':id/members/:userId')
  async addMember(
    @Param('id') groupId: string,
    @Param('userId') userId: string,
    @Body('role') role: GroupRole,
    @Request() req,
  ) {
    return this.groupService.addMember(groupId, userId, role, req.user.userId);
  }

  @Patch(':id/members/:userId')
  async updateMember(
    @Param('id') groupId: string,
    @Param('userId') userId: string,
    @Body('role') role: GroupRole,
    @Request() req,
  ) {
    return this.groupService.updateMemberRole(
      groupId,
      userId,
      role,
      req.user.userId,
    );
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.groupService.removeMember(groupId, userId, req.user.userId);
  }
}
