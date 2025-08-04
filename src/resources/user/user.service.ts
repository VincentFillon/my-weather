import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from 'src/resources/auth/enums/role.enum';
import {
  GroupMembership,
  GroupMembershipDocument,
} from 'src/resources/group/entities/group-membership.entity';
import { GroupDocument } from 'src/resources/group/entities/group.entity';
import { User, UserDocument } from 'src/resources/user/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FullUpdateUserDto } from './dto/full-update-user.dto'; // Note: Ce DTO ne devrait plus contenir 'mood'.

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(GroupMembership.name)
    private groupMembershipModel: Model<GroupMembershipDocument>,
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
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const hashedPassword = await hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return user.save();
  }

  async findAll(groupId: string): Promise<UserDocument[]> {
    const memberships = await this.groupMembershipModel.find({ group: groupId }).exec();
    const userIds = memberships.map((m) => m.user);
    return this.userModel
      .find({ _id: { $in: userIds } })
      .populate({
        path: 'memberships',
        match: { group: groupId },
        populate: {
          path: 'mood',
        },
      })
      .exec();
  }

  findOne(id: string): Promise<UserDocument> {
    return this.userModel
      .findById(id)
      .populate({
        path: 'memberships',
        populate: [{ path: 'mood' }, { path: 'group' }],
      })
      .exec();
  }

  findMany(ids: string[]): Promise<UserDocument[]> {
    return this.userModel
      .find({ _id: { $in: ids } })
      .populate({
        path: 'memberships',
        populate: {
          path: 'mood',
        },
      })
      .exec();
  }

  findByUsername(username: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ username })
      .populate({
        path: 'memberships',
        populate: {
          path: 'mood',
        },
      })
      .exec();
  }

  findByDisplayName(displayName: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ displayName })
      .populate({
        path: 'memberships',
        populate: {
          path: 'mood',
        },
      })
      .exec();
  }

  async update(
    id: string,
    updateUserDto: FullUpdateUserDto,
    fromUser?: User,
  ): Promise<UserDocument> {
    const userToUpdate = await this.userModel.findById(id).exec();

    // Si un utilisateur non admin essaye de modifier le rôle de son utilisateur ou d'un autre utilisateur : bloquer la requête
    if (
      updateUserDto.role &&
      userToUpdate.role !== updateUserDto.role &&
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
    return this.findOne(id);
  }

  async updateMood(
    userId: string,
    groupId: string,
    moodId: string,
    fromUser?: User,
  ): Promise<UserDocument> {
    const membership = await this.groupMembershipModel
      .findOne({
        user: userId,
        group: groupId,
      })
      .populate('group')
      .exec();

    if (!membership) {
      throw new ForbiddenException('User is not a member of this group.');
    }

    const previousMoodId = membership.mood;

    if (previousMoodId?.toString() === moodId) {
      return this.findOne(userId);
    }

    await this.groupMembershipModel
      .updateOne({ _id: membership._id }, { $set: { mood: moodId } })
      .exec();

    const updatedUser = await this.findOne(userId);

    this.eventEmitter.emit('user.mood.updated', {
      user: updatedUser,
      group: membership.group as GroupDocument,
      fromUser,
    });

    return updatedUser;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndDelete(id)
      .exec();
    await this.groupMembershipModel.deleteMany({ user: id }).exec();
    this.eventEmitter.emit('user.removed', id);
    return user;
  }
}
