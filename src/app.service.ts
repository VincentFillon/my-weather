import { Injectable } from '@nestjs/common';
import packageJson from 'package.json';

@Injectable()
export class AppService {
  getHello(): string {
    return `Météo des humeurs - v${packageJson.version}`;
  }
}
