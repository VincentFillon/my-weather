import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { PublicHoliday } from 'src/resources/public-holidays/dto/public-holiday';

@ApiTags('Public Holidays')
@Controller('public-holidays')
export class PublicHolidaysController {
  private readonly API_URL = 'https://calendrier.api.gouv.fr/jours-feries';

  private publicHolidays?: PublicHoliday[];
  private publicHolidaysPerYear: Map<string, PublicHoliday[]> = new Map<
    string,
    PublicHoliday[]
  >();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  @Get('')
  @ApiOperation({
    summary: "Récupérer tous les jours fériés depuis 2003 jusqu'à N+3",
    description:
      "Retourne la liste des jours fériés obtenus via l'API publique de l'Etat français (https://calendrier.api.gouv.fr/jours-feries/metropole.json)",
  })
  async findAll(): Promise<PublicHoliday[]> {
    const cachedPublicHolidays =
      await this.cacheManager.get<PublicHoliday[]>('publicHolidays');
    if (cachedPublicHolidays && cachedPublicHolidays.length > 0)
      return cachedPublicHolidays;

    let publicHolidays: PublicHoliday[] = [];

    const response = await firstValueFrom(
      this.httpService.get<{ [date: string]: string }>(
        `${this.API_URL}/metropole.json`,
      ),
    );

    if (response.data) {
      publicHolidays = Object.entries(response.data).map(([date, name]) =>
        plainToClass(PublicHoliday, { date, name }),
      );

      await this.cacheManager.set('publicHolidays', publicHolidays);
    }

    return publicHolidays;
  }

  @Get('year/:year')
  @ApiOperation({
    summary: "Récupérer tous les jours fériés de l'année donnée",
    description:
      "Retourne la liste des jours fériés de l'année donnée obtenus via l'API publique de l'Etat français (https://calendrier.api.gouv.fr/jours-feries/metropole.json)",
  })
  async findForYear(@Param('year') year: string): Promise<PublicHoliday[]> {
    const cachedPublicHolidays = await this.cacheManager.get<PublicHoliday[]>(
      `publicHolidays${year}`,
    );
    if (cachedPublicHolidays && cachedPublicHolidays.length > 0)
      return cachedPublicHolidays;

    let publicHolidays: PublicHoliday[] = [];

    const response = await firstValueFrom(
      this.httpService.get<{ [date: string]: string }>(
        `${this.API_URL}/metropole/${year}.json`,
      ),
    );

    if (response.data) {
      publicHolidays = Object.entries(response.data).map(([date, name]) =>
        plainToClass(PublicHoliday, { date, name }),
      );

      await this.cacheManager.set(`publicHolidays${year}`, publicHolidays);
    }

    return publicHolidays;
  }

  @Get('next')
  @ApiOperation({
    summary: 'Récupérer le prochain jour férié',
    description:
      'Retourne le prochain jour férié par rapport à la date du jour',
  })
  async findNext(): Promise<PublicHoliday> {
    const today = new Date();
    const year = today.getFullYear().toString();
    return this.findClosestPublicHoliday(year);
  }

  private async findClosestPublicHoliday(
    year: string,
    iteration: number = 0,
  ): Promise<PublicHoliday> {
    if (iteration > 3) {
      throw new Error('Echec de la récupération du prochain jour férié');
    }
    const yearPublicHolidays = await this.findForYear(year);

    const todayTimestamp = new Date(year).getTime();
    let closestPublicHoliday = yearPublicHolidays.reduce(
      (closest, publicHoliday) => {
        const publicHolidayTimestamp = publicHoliday.date.getTime();
        const closestTimestamp = closest ? closest.date.getTime() : Infinity;
        return publicHolidayTimestamp >= todayTimestamp &&
          publicHolidayTimestamp < closestTimestamp
          ? publicHoliday
          : closest;
      },
      undefined as PublicHoliday | undefined,
    );

    if (!closestPublicHoliday) {
      closestPublicHoliday = await this.findClosestPublicHoliday(
        year + 1,
        iteration + 1,
      );
    }

    return closestPublicHoliday;
  }
}
