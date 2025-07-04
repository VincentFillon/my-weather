import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard'; // Assurez-vous que le chemin est correct
import { MoodChartDataDto } from './dto/mood-chart-data.dto';
import { MoodChartService } from './mood-chart.service';

@ApiTags('mood-chart')
@Controller('mood-chart')
export class MoodChartController {
  constructor(private readonly moodChartService: MoodChartService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir les données du graphique d'humeur pour l'utilisateur authentifié" })
  @ApiResponse({ status: 200, description: 'Données du graphique récupérées avec succès.', type: [MoodChartDataDto] })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async getMoodChartData(@Request() req): Promise<MoodChartDataDto[]> {
    return this.moodChartService.getMoodChartData(req.user.userId);
  }
}