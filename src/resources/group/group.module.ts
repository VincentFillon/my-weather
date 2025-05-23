import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupController } from 'src/resources/group/group.controller';
import { GroupService } from 'src/resources/group/group.service';
import {
  GroupMembership,
  GroupMembershipSchema,
} from './entities/group-membership.entity';
import { Group, GroupSchema } from './entities/group.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMembership.name, schema: GroupMembershipSchema },
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
