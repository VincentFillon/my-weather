import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { NotificationSubscription, NotificationSubscriptionDocument } from './schemas/notification-subscription.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(NotificationSubscription.name) private subscriptionModel: Model<NotificationSubscriptionDocument>,
    private configService: ConfigService
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = 'mailto:example@yourdomain.org'; // Replace with your email

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys not found. Push notifications will not work.');
    }
  }

  async addSubscription(subscription: any, userId?: string): Promise<NotificationSubscription> {
    const exists = await this.subscriptionModel.findOne({ endpoint: subscription.endpoint });
    if (exists) {
        return exists;
    }
    const newSubscription = new this.subscriptionModel({
      ...subscription,
      userId,
    });
    return newSubscription.save();
  }

  async sendNotificationToAll(payload: any, excludeUserId?: string): Promise<void> {
    const query: any = {};
    if (excludeUserId) {
      query.userId = { $ne: excludeUserId };
    }
    const subscriptions = await this.subscriptionModel.find(query);
    await this.sendToSubscriptions(subscriptions, payload);
  }

  async sendNotificationToUser(userId: string, payload: any): Promise<void> {
    const subscriptions = await this.subscriptionModel.find({ userId });
    await this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToSubscriptions(subscriptions: NotificationSubscriptionDocument[], payload: any) {
    const notifications = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
        },
      };
      return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        .catch(err => {
            this.logger.error(`Error sending notification to ${sub.endpoint}`, err);
            if (err.statusCode === 410 || err.statusCode === 404) {
                this.subscriptionModel.deleteOne({ endpoint: sub.endpoint }).exec();
            }
        });
    });

    await Promise.all(notifications);
  }
}
