import { Request, Response, NextFunction } from 'express';
import { calendarService } from './calendar.service';

export class CalendarController {
  async getUnifiedCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { from, to, users } = req.query;

      const userIds = users
        ? typeof users === 'string'
          ? users.split(',').map((u) => u.trim())
          : (users as string[])
        : undefined;

      const feed = await calendarService.getUnifiedCalendar(workspaceId, {
        from: from as string | undefined,
        to: to as string | undefined,
        userIds,
      });

      res.status(200).json({ success: true, data: feed });
    } catch (err) {
      next(err);
    }
  }

  async getFreeBusy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { users, date, duration } = req.query;

      const userIds = users
        ? typeof users === 'string'
          ? users.split(',').map((u) => u.trim())
          : (users as string[])
        : [];

      const targetDate = (date as string) || new Date().toISOString().split('T')[0];
      const durationMinutes = duration ? parseInt(duration as string, 10) : 30;

      const result = await calendarService.findFreeBusy(
        workspaceId,
        userIds,
        targetDate,
        durationMinutes
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const userId = req.user!.id;

      const event = await calendarService.createEvent(userId, workspaceId, req.body);
      res.status(201).json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params['id'] as string;
      const userId = req.user!.id;

      await calendarService.deleteEvent(eventId, userId);
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }
}

export const calendarController = new CalendarController();
