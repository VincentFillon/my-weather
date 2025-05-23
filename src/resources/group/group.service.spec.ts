import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupMembership } from './entities/group-membership.entity';
import { Group } from './entities/group.entity';
import { GroupRole } from './enums/group-role.enum';
import { GroupService } from './group.service';

describe('GroupService', () => {
  let service: GroupService;
  let groupModel: any;
  let groupMembershipModel: any;

  beforeEach(async () => {
    groupModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
    };
    groupMembershipModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteMany: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: getModelToken(Group.name),
          useValue: groupModel,
        },
        {
          provide: getModelToken(GroupMembership.name),
          useValue: groupMembershipModel,
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
  });

  describe('createGroup', () => {
    it('should create a group and add creator as manager', async () => {
      const fakeGroup = { _id: 'gid' };
      groupModel.create.mockResolvedValue(fakeGroup);
      groupMembershipModel.create.mockResolvedValue({});

      const result = await service.createGroup({ name: 'Mon Groupe' }, 'uid');

      expect(groupModel.create).toHaveBeenCalledWith({ name: 'Mon Groupe' });
      expect(groupMembershipModel.create).toHaveBeenCalledWith({
        user: 'uid',
        group: 'gid',
        role: GroupRole.MANAGER,
      });
      expect(result).toBe(fakeGroup);
    });
  });

  describe('findById', () => {
    it('should return the group if found', async () => {
      const group = { _id: 'gid' };
      groupModel.findById.mockResolvedValue(group);
      expect(await service.findById('gid')).toBe(group);
    });
    it('should throw NotFoundException if not found', async () => {
      groupModel.findById.mockResolvedValue(null);
      await expect(service.findById('dummy')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateGroup', () => {
    it('should update the group if manager', async () => {
      // Arrange
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      groupModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'gid',
        name: 'updated',
      });

      // Act
      const result = await service.updateGroup(
        'gid',
        { name: 'updated' },
        'uid',
      );

      expect(groupMembershipModel.findOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'uid',
      });
      expect(groupModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'gid',
        { name: 'updated' },
        { new: true },
      );
      expect(result).toEqual({ _id: 'gid', name: 'updated' });
    });

    it('should throw if not manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(service.updateGroup('gid', {}, 'uid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteGroup', () => {
    it('should delete memberships and the group if manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      groupMembershipModel.deleteMany.mockResolvedValue({});
      groupModel.findByIdAndDelete.mockResolvedValue({});

      await service.deleteGroup('gid', 'uid');

      expect(groupMembershipModel.findOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'uid',
      });
      expect(groupMembershipModel.deleteMany).toHaveBeenCalledWith({
        group: 'gid',
      });
      expect(groupModel.findByIdAndDelete).toHaveBeenCalledWith('gid');
    });

    it('should throw if not manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(service.deleteGroup('gid', 'uid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMemberships', () => {
    it('should return group memberships with populated users', async () => {
      const memberships = [{ user: 'u1' }, { user: 'u2' }];
      const populateMock = jest.fn().mockReturnValue(memberships);
      groupMembershipModel.find.mockReturnValue({ populate: populateMock });

      const results = await service.getMemberships('gid');
      expect(groupMembershipModel.find).toHaveBeenCalledWith({ group: 'gid' });
      expect(populateMock).toHaveBeenCalledWith('user');
      expect(results).toBe(memberships);
    });
  });

  describe('addMember', () => {
    it('should add a member if manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      groupMembershipModel.create.mockResolvedValue({
        user: 'uid',
        role: GroupRole.MEMBER,
      });

      const result = await service.addMember(
        'gid',
        'uid',
        GroupRole.MEMBER,
        'mid',
      );
      expect(groupMembershipModel.findOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'mid',
      });
      expect(groupMembershipModel.create).toHaveBeenCalledWith({
        group: 'gid',
        user: 'uid',
        role: GroupRole.MEMBER,
      });
      expect(result).toEqual({ user: 'uid', role: GroupRole.MEMBER });
    });

    it('should throw if not manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(
        service.addMember('gid', 'uid', GroupRole.MEMBER, 'mid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role if manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      groupMembershipModel.findOneAndUpdate.mockResolvedValue({
        user: 'uid',
        role: GroupRole.MANAGER,
      });
      const result = await service.updateMemberRole(
        'gid',
        'uid',
        GroupRole.MANAGER,
        'mid',
      );
      expect(groupMembershipModel.findOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'mid',
      });
      expect(groupMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { group: 'gid', user: 'uid' },
        { role: GroupRole.MANAGER },
        { new: true },
      );
      expect(result).toEqual({ user: 'uid', role: GroupRole.MANAGER });
    });

    it('should throw if not manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(
        service.updateMemberRole('gid', 'uid', GroupRole.MANAGER, 'mid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove member if manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      groupMembershipModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      await service.removeMember('gid', 'uid', 'mid');
      expect(groupMembershipModel.findOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'mid',
      });
      expect(groupMembershipModel.deleteOne).toHaveBeenCalledWith({
        group: 'gid',
        user: 'uid',
      });
    });

    it('should throw if not manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(service.removeMember('gid', 'uid', 'mid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertIsManager', () => {
    it('should do nothing if user is manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MANAGER,
      });
      await expect(
        service['assertIsManager']('gid', 'uid'),
      ).resolves.not.toThrow();
    });

    it('should throw if user is missing or not a manager', async () => {
      groupMembershipModel.findOne.mockResolvedValue(null);
      await expect(service['assertIsManager']('gid', 'uid')).rejects.toThrow(
        ForbiddenException,
      );

      groupMembershipModel.findOne.mockResolvedValue({
        role: GroupRole.MEMBER,
      });
      await expect(service['assertIsManager']('gid', 'uid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
