import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.getUserNotifications(req.user!.id);
      res.status(200).json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await notificationService.markAsRead(id, req.user!.id);
      res.status(200).json({ success: true, data: { message: 'Marked as read' } });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, data: { message: 'All notifications marked as read' } });
    } catch (err) {
      next(err);
    }
  },
};
