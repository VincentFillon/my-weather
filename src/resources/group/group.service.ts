import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateGroupMemberDto } from 'src/resources/group/dto/update-group-member.dto';
import { User } from '../user/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import {
  GroupMembership,
  GroupMembershipDocument,
} from './entities/group-membership.entity';
import { Group, GroupDocument } from './entities/group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMembership.name)
    private groupMembershipModel: Model<GroupMembershipDocument>,
  ) {}

  async create(createGroupDto: CreateGroupDto, owner: User) {
    const group = new this.groupModel({ ...createGroupDto, owner });
    return group.save();
  }

  findAll() {
    return this.groupModel.find().exec();
  }

  findOne(id: string) {
    return this.groupModel.findById(id).exec();
  }

  // update(id: number, updateGroupDto: UpdateGroupDto) {
  //   return `This action updates a #${id} group`;
  // }

  remove(id: string) {
    return this.groupModel.findByIdAndDelete(id).exec();
  }

  async updateMember(
    groupId: string,
    updateGroupMemberDto: UpdateGroupMemberDto,
  ) {
    const { userId, role } = updateGroupMemberDto;
    return this.groupMembershipModel.findOneAndUpdate(
      { group: groupId, user: userId },
      { role },
      { upsert: true, new: true },
    );
  }

  async removeMember(
    groupId: string,
    userId: string,
  ): Promise<{ deletedCount: number }> {
    return this.groupMembershipModel
      .deleteOne({ group: groupId, user: userId })
      .exec();
  }
}