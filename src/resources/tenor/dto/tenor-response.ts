import { TenorGif } from 'src/resources/tenor/dto/tenor-gif';

export interface TenorResponse {
  locale?: string;
  results: TenorGif[];
  next: string;
}