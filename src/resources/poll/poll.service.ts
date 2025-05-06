import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreatePollDto } from 'src/resources/poll/dto/create-poll.dto';
import { SearchPollsDto } from 'src/resources/poll/dto/search-polls.dto';
import { UpdatePollDto } from 'src/resources/poll/dto/update-poll.dto';
import { UserVoteDto } from 'src/resources/poll/dto/user-vote.dto';
import {
  PollOption,
  PollOptionDocument,
} from 'src/resources/poll/entities/poll-option.entity';
import { Poll, PollDocument } from 'src/resources/poll/entities/poll.entity';
import {
  UserVote,
  UserVoteDocument,
} from 'src/resources/poll/entities/user-vote.entity';
import { UserService } from 'src/resources/user/user.service';

@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    @InjectModel(PollOption.name)
    private pollOptionModel: Model<PollOptionDocument>,
    @InjectModel(UserVote.name)
    private userVoteModel: Model<UserVoteDocument>,
    private userService: UserService,
  ) {}

  async create(createPollDto: CreatePollDto, creatorId: string): Promise<Poll> {
    const creator = await this.userService.findOne(creatorId);
    if (!creator) {
      throw new NotFoundException('User not found');
    }
    const poll = new this.pollModel({ ...createPollDto, creator });
    await poll.save();
    return this.pollModel.findById(poll._id).populate('creator').exec();
  }

  async findAll(): Promise<Poll[]> {
    return this.pollModel.find().populate('creator').exec();
  }

  async search(filters: SearchPollsDto): Promise<Poll[]> {
    const query: FilterQuery<Poll> = {};

    if (filters.pollId) {
      query._id = new Types.ObjectId(filters.pollId);
    }
    if (filters.pollIds) {
      query._id = { $in: filters.pollIds.map((id) => new Types.ObjectId(id)) };
    }
    if (filters.creatorId) {
      query.creator = new Types.ObjectId(filters.creatorId);
    }
    if (filters.term) {
      query.$or = [
        { title: { $regex: filters.term, $options: 'i' } },
        { description: { $regex: filters.term, $options: 'i' } },
        { 'creator.displayName': { $regex: filters.term, $options: 'i' } },
      ];
    }
    if (filters.createdFrom) {
      query.createdAt = { $gte: filters.createdFrom };
    }
    if (filters.createdTo) {
      query.createdAt = { $lte: filters.createdTo };
    }
    if (filters.ended === true) {
      query.endDate = { $lte: new Date() };
    } else if (filters.ended === false) {
      query.endDate = { $gt: new Date() };
    }
    if (filters.endFrom) {
      query.endDate = { $gte: filters.endFrom };
    }
    if (filters.endTo) {
      query.endDate = { $lte: filters.endTo };
    }

    let find = this.pollModel.find(query);

    if (filters.sort) {
      find = find.sort([[filters.sort, filters.order || 'asc']]);
    }

    if (filters.limit) {
      find = find.limit(filters.limit);
    }
    if (filters.skip) {
      find = find.skip(filters.skip);
    }

    return find.populate('creator').exec();
  }

  async findOne(pollId: string): Promise<Poll> {
    return this.pollModel.findById(pollId).populate('creator').exec();
  }

  async findByUser(userId: string): Promise<Poll[]> {
    return this.pollModel
      .find({ creator: { $in: [userId] } })
      .populate('creator')
      .exec();
  }

  async update(pollId: string, updatePollDto: UpdatePollDto): Promise<Poll> {
    return this.pollModel.findByIdAndUpdate(pollId, updatePollDto, {
      new: true,
      populate: 'creator',
    });
  }

  async findVotesByPollId(pollId: string): Promise<UserVote[]> {
    return this.userVoteModel
      .find({ poll: new Types.ObjectId(pollId) })
      .populate('user');
  }

  async findVotesByUserId(userId: string) {
    return this.userVoteModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('user');
  }

  async vote(userId: string, userVoteDto: UserVoteDto) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    const poll = await this.pollModel.findById(userVoteDto.pollId);
    if (!poll) {
      this.logger.error(`Poll not found: ${userVoteDto.pollId}`);
      throw new NotFoundException('Poll not found');
    }
    if (poll.endDate < new Date()) {
      this.logger.error(
        `Poll already ended: ${poll._id} (since ${poll.endDate})`,
      );
      throw new ForbiddenException('Poll has already ended');
    }
    if (
      !poll.multipleChoice &&
      userVoteDto.selectedOptions &&
      userVoteDto.selectedOptions.length > 1
    ) {
      this.logger.error(`Poll does not allow multiple choices: ${poll._id}`);
      throw new ForbiddenException('You can only select one option');
    }

    // TODO: vérifier que les options sélectionnées existent dans le sondage

    let userVote = await this.userVoteModel.findOne({
      poll: new Types.ObjectId(userVoteDto.pollId),
      user: user._id,
    });

    if (!userVote) {
      userVote = new this.userVoteModel({
        poll: new Types.ObjectId(userVoteDto.pollId),
        user: user._id,
        selectedOptions: [],
      });
    }

    userVote.selectedOptions =
      userVoteDto.selectedOptions?.map(
        (optionId) => new Types.ObjectId(optionId),
      ) || [];

    await userVote.save();

    return userVote;
  }

  async delete(pollId: string): Promise<void> {
    await this.pollModel.findByIdAndDelete(pollId);
  }
}
