import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { TenorService } from './tenor.service';

@ApiTags('Tenor GIFs')
@UseGuards(JwtAuthGuard)
@Controller('tenor')
export class TenorController {
  constructor(private readonly tenorService: TenorService) {}

  @Get('trending')
  @ApiOperation({
    summary: "Récupérer les GIFs tendance sur l'API Tenor",
    description: "Retourne la liste des GIFs tendance obtenus via l'API Tenor.",
  })
  getTrendingGifs(@Query('limit') limit: string, @Query('next') next: string) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      return this.tenorService.getTrendingGifs(parsedLimit, next);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('search')
  @ApiOperation({
    summary: "Recherche des GIFs sur l'API Tenor",
    description:
      "Retourne la liste des GIFs correspondant à la requête sur l'API Tenor.",
  })
  searchGifs(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @Query('next') next: string,
  ) {
    if (!query) {
      throw new BadRequestException(
        'Query parameter "q" is required for search.',
      );
    }
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      return this.tenorService.searchGifs(query, parsedLimit, next);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
