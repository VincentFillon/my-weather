import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserHistoryFilters } from 'src/resources/user-history/dto/user-history.filters';
import { UserHistoryService } from 'src/resources/user-history/user-history.service';
import { PaginatedResults } from 'src/utils/paginated.results';
import { Role } from '../auth/enums/role.enum';

@ApiTags('User History')
@Controller('user-history')
export class UserHistoryController {
  constructor(private readonly userHistoryService: UserHistoryService) {}

  @Get('')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Récupérer l'historique de tous les utilisateurs",
    description: "Retourne l'historique complet de tous les utilisateurs",
  })
  async findAll() {
    return this.userHistoryService.findAll();
  }

  @Post('search')
  @ApiOperation({
    summary:
      "Récupérer certaines entrées d'historique en fonction de différents filtres",
    description: "Retourne les entrées d'historique recherchées (paginées)",
  })
  @ApiResponse({
    status: 200,
    type: PaginatedResults<UserHistoryFilters>,
  })
  async findByFilters(
    @Req() request: Request,
    @Body() filters: UserHistoryFilters,
  ) {
    const currentUser = (request as any).user;
    if (
      (!filters.userId || currentUser.sub !== filters.userId) &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.userHistoryService.findByFilters(filters);
  }

  @Get(':userId')
  @ApiOperation({
    summary: "Récupérer l'historique d'un utilisateur par son Id",
    description: "Retourne l'historique complet d'un utilisateur",
  })
  async findByUser(@Req() request: Request, @Param('userId') userId: string) {
    const currentUser = (request as any).user;
    if (currentUser.sub !== userId && currentUser.role !== Role.ADMIN) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.userHistoryService.findByUser(userId);
  }
}
