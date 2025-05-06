import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PollOption,
  PollOptionSchema,
} from 'src/resources/poll/entities/poll-option.entity';
import { Poll, PollSchema } from 'src/resources/poll/entities/poll.entity';
import {
  UserVote,
  UserVoteSchema,
} from 'src/resources/poll/entities/user-vote.entity';
import { PollController } from 'src/resources/poll/poll.controller';
import { PollGateway } from 'src/resources/poll/poll.gateway';
import { PollService } from 'src/resources/poll/poll.service';
import { UserModule } from 'src/resources/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Poll.name, schema: PollSchema },
      { name: PollOption.name, schema: PollOptionSchema },
      { name: UserVote.name, schema: UserVoteSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UserModule,
  ],
  providers: [PollGateway, PollService],
  exports: [PollService],
  controllers: [PollController],
})
export class PollModule {}
