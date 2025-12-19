import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Body() body: any, @Req() req: any) {
    const userId = req.user.sub;   
    return this.notificationService.addSubscription(body, userId);
  }

  @Post('send')
  async send(@Body() payload: { title: string; body: string }) {
    // This endpoint should be protected (Admin only)
    const notificationPayload = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: 'assets/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        },
      },
    };
    await this.notificationService.sendNotificationToAll(notificationPayload);
    return { success: true };
  }
}
