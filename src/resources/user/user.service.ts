import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from 'src/resources/auth/enums/role.enum';
import { User, UserDocument } from 'src/resources/user/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FullUpdateUserDto } from './dto/full-update-user.dto';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Patch pour les utilisateurs sans displayName
    this.userModel.find({ displayName: null }).exec().then((users) => {
      users.forEach((user) => {
        user.displayName = user.username;
        user.save();
      });
    });
  }

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

  findByDisplayName(displayName: string): Promise<UserDocument> {
    return this.userModel.findOne({ displayName }).populate('mood').exec();
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

    // Si un utilisateur non admin essaye de modifier le rôle de son utilisateur ou d'un autre utilisateur : bloquer la requête
    if (previousUser.role !== updateUserDto.role && updateUserDto.role === Role.ADMIN && (!fromUser || fromUser.role !== Role.ADMIN)) {
      throw new ForbiddenException('Forbidden');
    }

    // Si le mot de passe est modifié : encrypter le nouveau mot de passe
    if (updateUserDto.password) {
      const hashedPassword = await hash(updateUserDto.password, 10);
      updateUserDto.password = hashedPassword;
    }

    // Mettre à jour l'utilisateur
    await this.userModel.findByIdAndUpdate(id, updateUserDto).exec();
    const updatedUser = await this.findOne(id);
    // console.debug(updatedUser);

    if (previousUser.mood?._id !== updatedUser.mood?._id) {
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
