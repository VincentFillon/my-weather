import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoodModule } from './resources/mood/mood.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DATABASE}`,
    ),
    MoodModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
