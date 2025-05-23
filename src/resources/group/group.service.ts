import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GroupMembership,
  GroupMembershipDocument,
} from './entities/group-membership.entity';
import { Group, GroupDocument } from './entities/group.entity';
import { GroupRole } from './enums/group-role.enum';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMembership.name)
    private groupMembershipModel: Model<GroupMembershipDocument>,
  ) {}

  // CRUD Group
  async createGroup(data: Partial<Group>, userId: string): Promise<Group> {
    // Crée le groupe et ajoute le créateur comme manager
    const group = await this.groupModel.create(data);
    await this.groupMembershipModel.create({
      user: userId,
      group: group._id,
      role: GroupRole.MANAGER,
    });
    return group;
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupModel.findById(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async updateGroup(
    id: string,
    data: Partial<Group>,
    userId: string,
  ): Promise<Group> {
    await this.assertIsManager(id, userId);
    return this.groupModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteGroup(id: string, userId: string) {
    await this.assertIsManager(id, userId);
    await this.groupMembershipModel.deleteMany({ group: id });
    return this.groupModel.findByIdAndDelete(id);
  }

  // Membres d'un groupe
  async getMemberships(groupId: string) {
    return this.groupMembershipModel.find({ group: groupId }).populate('user');
  }

  async addMember(
    groupId: string,
    userId: string,
    role: GroupRole = GroupRole.MEMBER,
    managerId: string,
  ) {
    await this.assertIsManager(groupId, managerId);
    return this.groupMembershipModel.create({
      group: groupId,
      user: userId,
      role,
    });
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    role: GroupRole,
    managerId: string,
  ) {
    await this.assertIsManager(groupId, managerId);
    return this.groupMembershipModel.findOneAndUpdate(
      { group: groupId, user: userId },
      { role },
      { new: true },
    );
  }

  async removeMember(groupId: string, userId: string, managerId: string) {
    await this.assertIsManager(groupId, managerId);
    await this.groupMembershipModel.deleteOne({ group: groupId, user: userId });
  }

  // Utils: assertions et droits
  async assertIsManager(groupId: string, userId: string) {
    const membership = await this.groupMembershipModel.findOne({
      group: groupId,
      user: userId,
    });
    if (!membership || membership.role !== GroupRole.MANAGER) {
      throw new ForbiddenException(
        'Seul un manager du groupe peut effectuer cette action.',
      );
    }
  }
}
