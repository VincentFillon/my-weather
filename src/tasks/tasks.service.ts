import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserService } from 'src/resources/user/user.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private userService: UserService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'resetUserMoods',
    timeZone: 'Europe/Paris',
  })
  async resetUserMoods() {
    this.logger.log('Réinitialisation des humeurs des utilisateurs');
    const users = await this.userService.findAll();
    for (const user of users) {
      user.mood = null;
      await user.save();
      this.eventEmitter.emit('user.mood.updated', user, null);
    }
  }
}
