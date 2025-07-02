import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TenorResponse } from 'src/resources/tenor/dto/tenor-response';

@Injectable()
export class TenorService {
  private readonly TENOR_API_KEY: string;
  private readonly BASE_URL = 'https://tenor.googleapis.com/v2/';

  private logger: Logger = new Logger(TenorService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.TENOR_API_KEY = this.configService.get<string>('TENOR_API_KEY');
    if (!this.TENOR_API_KEY) {
      throw new InternalServerErrorException(
        'TENOR_API_KEY is not defined in environment variables.',
      );
    }
  }

  getTrendingGifs(
    limit: number = 20,
    next: string = '',
  ): Observable<TenorResponse> {
    const url = `${this.BASE_URL}featured?key=${this.TENOR_API_KEY}&client_key=meteo-back&limit=${limit}${next ? `&pos=${next}` : ''}&media_filter=gif`;

    this.logger.log(`HTTP [GET] : ${url}`);

    return this.httpService.get<TenorResponse>(url).pipe(
      map((response: AxiosResponse) => response.data),
      catchError((error) => {
        console.error(
          'Error fetching trending GIFs from Tenor:',
          error.response?.data || error.message,
        );
        throw new InternalServerErrorException(
          'Failed to fetch trending GIFs from Tenor.',
        );
      }),
    );
  }

  searchGifs(
    query: string,
    limit: number = 20,
    next: string = '',
  ): Observable<TenorResponse> {
    const url = `${this.BASE_URL}search?q=${query}&key=${this.TENOR_API_KEY}&client_key=meteo-back&limit=${limit}${next ? `&pos=${next}` : ''}&media_filter=gif`;

    this.logger.log(`HTTP [GET] : ${url}`);

    return this.httpService.get<TenorResponse>(url).pipe(
      map((response: AxiosResponse) => response.data),
      catchError((error) => {
        console.error(
          'Error searching GIFs from Tenor:',
          error.response?.data || error.message,
        );
        throw new InternalServerErrorException(
          'Failed to search GIFs from Tenor.',
        );
      }),
    );
  }
}
