import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
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
  async getMoodChartData(@Request() req, @Query('days') days: number): Promise<MoodChartDataDto[]> {
    const nbDays = days != null ? +days : 7; // Si aucun nombre de jours n'est fourni, utiliser 7 par défaut
    return this.moodChartService.getMoodChartData(req.user.sub, days);
  }
}