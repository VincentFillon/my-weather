import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Role } from 'src/resources/auth/enums/role.enum';
import { PollService } from 'src/resources/poll/poll.service';

@ApiTags('Poll')
@UseGuards(JwtAuthGuard)
@Controller('poll')
export class PollController {
  constructor(private pollService: PollService) {}

  @Get('')
  @ApiOperation({
    summary: 'Récupérer la liste des sondages',
    description: 'Retourne la liste de tous les sondages',
  })
  async findAll() {
    return this.pollService.findAll();
  }

  @Get(':pollId')
  @ApiOperation({
    summary: 'Récupérer un sondage par son Id',
    description: "Retourne le sondage correspondant à l'Id donné",
  })
  async findOne(pollId: string) {
    return this.pollService.findOne(pollId);
  }
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Récupérer les sondages créés par un utilisateur par son Id',
    description: "Retourne les sondages de l'utilisateur",
  })
  async findByUser(@Req() request: Request, @Param('userId') userId: string) {
    const currentUser = (request as any).user;
    if (currentUser.sub !== userId && currentUser.role !== Role.ADMIN) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.pollService.findByUser(userId);
  }
}
