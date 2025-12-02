import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { Model, RootFilterQuery } from 'mongoose';
import { Role } from 'src/resources/auth/enums/role.enum';
import { User, UserDocument } from 'src/resources/user/entities/user.entity';
import { Frame, FrameDocument } from './entities/frame.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FullUpdateUserDto } from './dto/full-update-user.dto';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Frame.name) private frameModel: Model<Frame>,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Patch pour les utilisateurs sans displayName
    this.userModel
      .find({ displayName: null })
      .exec()
      .then((users) => {
        users.forEach((user) => {
          user.displayName = user.username;
          user.save();
        });
      });
    this.seedFrames();
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
    return this.userModel.find().populate('mood').populate('frames').populate('selectedFrame').exec();
  }

  findOne(id: string): Promise<UserDocument> {
    return this.userModel
      .findById(id)
      .populate('mood')
      .populate('frames')
      .populate('selectedFrame')
      .exec();
  }

  findMany(ids: string[]): Promise<UserDocument[]> {
    return this.userModel
      .find({ _id: { $in: ids } })
      .populate('mood')
      .populate('frames')
      .populate('selectedFrame')
      .exec();
  }

  findByUsername(username: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ username })
      .populate('mood')
      .populate('selectedFrame')
      .exec();
  }

  findByDisplayName(displayName: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ displayName })
      .populate('mood')
      .populate('selectedFrame')
      .exec();
  }

  findByMood(moodId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ mood: moodId })
      .populate('mood')
      .populate('selectedFrame')
      .exec();
  }

  async update(
    id: string,
    updateUserDto: FullUpdateUserDto,
    fromUser?: User,
  ): Promise<UserDocument> {
    const previousUser = await this.findOne(id);

    // Si un utilisateur non admin essaye de modifier le rôle de son utilisateur ou d'un autre utilisateur : bloquer la requête
    if (
      previousUser.role !== updateUserDto.role &&
      updateUserDto.role === Role.ADMIN &&
      (!fromUser || fromUser.role !== Role.ADMIN)
    ) {
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
    const user = await this.userModel
      .findByIdAndDelete(id)
      .populate('mood')
      .exec();
    this.eventEmitter.emit('user.removed', id);
    return user;
  }

  async selectFrame(userId: string, frameId: string): Promise<UserDocument> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Vérifier si l'utilisateur a sélectionné "Aucun" cadre
    if (!frameId) {
      user.selectedFrame = null;
    } else {
      // Vérifier si l'utilisateur possède le cadre
      const hasFrame = user.frames.some((f) => f._id.toString() === frameId);
      if (!hasFrame) {
        throw new Error('User does not own this frame');
      }

      user.selectedFrame = await this.frameModel.findById(frameId);
    }

    return user.save();
  }

  async addFrameToUser(userId: string, frameId: string): Promise<UserDocument> {
    const user = await this.findOne(userId);
    const frame = await this.frameModel.findById(frameId);
    if (!user || !frame) {
      throw new Error('User or Frame not found');
    }

    if (!user.frames.some((f) => f._id.toString() === frameId)) {
      user.frames.push(frame);
      await user.save();
    }
    return user;
  }

  async seedFrames(): Promise<Frame[]> {
    const defaultFrames = await this.getAllFrames({ isDefault: true });

    // Ajouter tous les cadres par défaut aux utilisateurs
    const users = await this.userModel.find();
    for (const user of users) {
      // Ajouter les cadres par défaut aux utilisateurs sans supprimer les cadres qu'ils ont déjà
      const framesIds = user.frames.map((f) => f._id.toString());
      const framesToAdd = defaultFrames.filter(
        (f) => !framesIds.includes(f._id.toString()),
      );
      user.frames = [...user.frames, ...framesToAdd];

      // Supprimer d'anciens cadres qui n'existeraient plus
      const userFramesIds = user.frames.map((f) => f._id.toString());
      const existingFrames = await this.getAllFrames({
        _id: { $in: userFramesIds },
      });
      if (existingFrames.length !== userFramesIds.length) {
        user.frames = existingFrames;
      }

      await user.save();
    }

    return defaultFrames;
  }

  async getAllFrames(
    filters?: RootFilterQuery<FrameDocument>,
  ): Promise<FrameDocument[]> {
    return this.frameModel.find(filters).exec();
  }

  async createFrame(createFrameDto: CreateFrameDto): Promise<Frame> {
    const frame = new this.frameModel(createFrameDto);
    return frame.save();
  }

  async updateFrame(
    id: string,
    updateFrameDto: UpdateFrameDto,
  ): Promise<Frame> {
    return this.frameModel
      .findByIdAndUpdate(id, updateFrameDto, { new: true })
      .exec();
  }

  async deleteFrame(id: string): Promise<Frame> {
    return this.frameModel.findByIdAndDelete(id).exec();
  }
}
