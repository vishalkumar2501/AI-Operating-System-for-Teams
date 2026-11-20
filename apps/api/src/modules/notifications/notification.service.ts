import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

export const notificationService = {
  async notify(input: CreateNotificationInput) {
    try {
      return await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          payload: input.payload as any,
        },
      });
    } catch (err) {
      logger.warn({ err, userId: input.userId }, 'Failed to create in-app notification');
      return null;
    }
  },

  async notifyMultiple(userIds: string[], type: string, payload: Record<string, unknown>) {
    const promises = userIds.map((userId) => this.notify({ userId, type, payload }));
    return Promise.all(promises);
  },

  async getUserNotifications(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
