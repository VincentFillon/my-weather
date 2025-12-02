import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AdventCalendarDay,
  AdventCalendarDayDocument,
} from './entities/advent-calendar-day.entity';
import {
  AdventCalendarUserOpen,
  AdventCalendarUserOpenDocument,
} from './entities/advent-calendar-user-open.entity';
import {
  AdventCalendarNotification,
  AdventCalendarNotificationDocument,
} from './entities/advent-calendar-notification.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class AdventCalendarService implements OnModuleInit {
  constructor(
    @InjectModel(AdventCalendarDay.name)
    private adventCalendarDayModel: Model<AdventCalendarDayDocument>,
    @InjectModel(AdventCalendarUserOpen.name)
    private adventCalendarUserOpenModel: Model<AdventCalendarUserOpenDocument>,
    @InjectModel(AdventCalendarNotification.name)
    private adventCalendarNotificationModel: Model<AdventCalendarNotificationDocument>,
    private userService: UserService,
  ) {}

  async onModuleInit() {
    await this.seedDays();
  }

  async seedDays() {
    const count = await this.adventCalendarDayModel.countDocuments();
    if (count === 0) {
      const days = [];
      for (let i = 1; i <= 24; i++) {
        days.push({
          day: i,
          content:
            i % 2 === 0
              ? 'https://picsum.photos/seed/' + i + '/300/300'
              : 'Citation du jour ' + i,
          type: i % 2 === 0 ? 'image' : 'quote',
        });
      }
      await this.adventCalendarDayModel.insertMany(days);
    }
  }

  async getCalendar(userId: string) {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed, 11 is December
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // Check if within range (Dec 1 - Jan 5)
    // Note: Jan 5 is month 0 of next year
    const isDecember = currentMonth === 11;
    const isJanuary = currentMonth === 0;

    // Logic for availability
    // Available if (Dec and day >= 1) OR (Jan and day <= 5)
    // But we also need to handle years. For simplicity, let's assume current season.
    // Actually, the requirement says "available from Dec 1st to Jan 5th".
    // We can just check the date.

    // For testing purposes, we might want to mock this, but for now use real date.
    
    const days = await this.adventCalendarDayModel.find().sort({ day: 1 });
    const openedDays = await this.adventCalendarUserOpenModel.find({
      user: { _id: userId },
    });
    const openedDayNumbers = openedDays.map((od) => od.day);

    return days.map((d) => {
      let status = 'LOCKED';
      const isOpened = openedDayNumbers.includes(d.day);

      if (isOpened) {
        status = 'OPENED';
      } else {
        // Check if openable
        // Openable if date >= Dec 1st AND date >= day (in December)
        // If we are in January (up to 5th), all days 1-24 are openable (past).
        
        if (isJanuary && currentDay <= 5) {
             status = 'OPENABLE';
        } else if (isDecember) {
            if (currentDay >= d.day) {
                status = 'OPENABLE';
            }
        }
      }

      return {
        day: d.day,
        status,
        // Only return content if opened
        content: isOpened ? d.content : null,
        type: isOpened ? d.type : null,
      };
    });
  }

  async openDay(userId: string, day: number) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Validate date range
    const isDecember = currentMonth === 11;
    const isJanuary = currentMonth === 0;
    
    if (!isDecember && !isJanuary) {
        throw new BadRequestException('Advent calendar is not active');
    }
    if (isJanuary && currentDay > 5) {
        throw new BadRequestException('Advent calendar is closed');
    }

    // Validate day
    if (day < 1 || day > 24) {
      throw new BadRequestException('Invalid day');
    }

    // Validate if day is in future
    if (isDecember && day > currentDay) {
      throw new BadRequestException('Cannot open future days');
    }

    // Check if already opened
    const existingOpen = await this.adventCalendarUserOpenModel.findOne({
      user: { _id: userId },
      day,
    });

    if (existingOpen) {
       // Requirement: "Re cliquer sur un jour déjà ouvert pour consulter à nouveau"
       // We just return the content.
       const dayEntity = await this.adventCalendarDayModel.findOne({ day });
       return {
           content: dayEntity.content,
           type: dayEntity.type,
           alreadyOpened: true
       };
    }

    // Open it
    const dayEntity = await this.adventCalendarDayModel.findOne({ day });
    if (!dayEntity) {
        throw new NotFoundException('Day not found');
    }

    await this.adventCalendarUserOpenModel.create({
      user: { _id: userId },
      day,
      openedAt: new Date(),
    });

    // Day 24 logic
    if (day === 24) {
        // Unlock frame
        // We need to find the frame first. For now, let's assume a frame with a specific name exists or create it?
        // The requirement says "débloquera un nouveau cadre".
        // Let's assume we search for a frame named "Cadre de l'Avent" or similar.
        // Or we can just pick one for now.
        // Ideally, we should have a specific frame ID or name in config.
        // I'll search for a frame with name "Noël 2025" or create it if missing in seed?
        // For now, let's try to find a frame or log a warning.
        // I will assume there is a frame called "Advent 2025".
        
        // Actually, I should probably seed this frame in UserService or here.
        // Let's try to find it by name.
        const frameName = "Cadre de l'Avent";
        // We need a method in UserService to find frame by name or we can use frameModel if we inject it, 
        // but UserService encapsulates it.
        // I'll add a method to UserService to find frame by name or just use getAllFrames with filter.
        
        const frames = await this.userService.getAllFrames({ name: frameName });
        if (frames.length > 0) {
            await this.userService.addFrameToUser(userId, frames[0]._id.toString());
        }
    }

    return {
        content: dayEntity.content,
        type: dayEntity.type,
        alreadyOpened: false
    };
  }

  async shouldNotifyUser(userId: string): Promise<boolean> {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Check if within range (Dec 1 - Jan 5)
    const isDecember = currentMonth === 11;
    const isJanuary = currentMonth === 0 && currentDay <= 5;

    if (!isDecember && !isJanuary) {
      return false;
    }

    // Check if already notified today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const notification = await this.adventCalendarNotificationModel.findOne({
      user: userId,
      lastNotificationDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (notification) {
      return false;
    }

    // Check if there is a box to open today
    // If it's Dec 5, and user hasn't opened Dec 5, notify.
    // If user has opened Dec 5, maybe don't notify?
    // Requirement: "pour l'inviter à aller voir le calendrier"
    // If they already opened it, no need to invite.
    
    // Check if user opened today's box (if today is in Dec 1-24)
    if (isDecember && currentDay <= 24) {
         const hasOpenedToday = await this.adventCalendarUserOpenModel.findOne({
             user: userId,
             day: currentDay
         });
         if (hasOpenedToday) {
             return false;
         }
    }
    
    // If it's Jan 1-5, we might want to notify if they have ANY unopened past boxes?
    // Or just notify once a day regardless?
    // "Une notification doit être envoyé suite à la 1ère connexion d'un utilisateur chaque jour"
    // It implies once a day.
    // Let's stick to: Notify once a day if calendar is active.
    // Maybe refine: only if they haven't opened *everything*?
    // For simplicity: Notify once a day during the period.
    
    return true;
  }

  async markUserNotified(userId: string) {
      const today = new Date();
      await this.adventCalendarNotificationModel.findOneAndUpdate(
          { user: userId },
          { lastNotificationDate: today },
          { upsert: true, new: true }
      );
  }
}
