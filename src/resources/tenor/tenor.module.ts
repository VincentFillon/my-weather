import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TenorController } from './tenor.controller';
import { TenorService } from './tenor.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [TenorController],
  providers: [TenorService],
})
export class TenorModule {}
