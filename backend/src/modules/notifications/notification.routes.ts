import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middleware/authenticate';

export const notificationRouter = Router();

notificationRouter.get('/notifications', authenticate, notificationController.getNotifications);
notificationRouter.patch(
  '/notifications/:id/read',
  authenticate,
  notificationController.markAsRead
);
notificationRouter.patch(
  '/notifications/read-all',
  authenticate,
  notificationController.markAllAsRead
);
