import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/resources/auth/auth.module';
import { Mood, MoodSchema } from 'src/resources/mood/entities/mood.entity';
import { UserModule } from 'src/resources/user/user.module';
import { MoodExistsValidator } from 'src/validators/mood-exists.validator';
import { MoodGateway } from './mood.gateway';
import { MoodService } from './mood.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mood.name, schema: MoodSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
    forwardRef(() => AuthModule),
  ],
  providers: [MoodGateway, MoodService, MoodExistsValidator],
})
export class MoodModule {}
