import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/resources/user/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FullUpdateUserDto } from './dto/full-update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const hashedPassword = await hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return user.save();
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().populate('mood').exec();
  }

  findOne(id: string): Promise<UserDocument> {
    return this.userModel.findById(id).populate('mood').exec();
  }

  findByUsername(username: string): Promise<UserDocument> {
    return this.userModel.findOne({ username }).populate('mood').exec();
  }

  findByMood(moodId: string): Promise<UserDocument[]> {
    return this.userModel.find({ mood: moodId }).populate('mood').exec();
  }

  async update(
    id: string,
    updateUserDto: FullUpdateUserDto,
    fromUser?: User,
  ): Promise<UserDocument> {
    const previousUser = await this.findOne(id);
    // Mettre à jour l'utilisateur
    await this.userModel.findByIdAndUpdate(id, updateUserDto).exec();
    const updatedUser = await this.findOne(id);
    // console.debug(updatedUser);

    if (previousUser.mood !== updatedUser.mood) {
      this.eventEmitter.emit('user.mood.updated', updatedUser, fromUser);
    }

    return updatedUser;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndDelete(id).populate('mood').exec();
    this.eventEmitter.emit('user.removed', id);
    return user;
  }
}
