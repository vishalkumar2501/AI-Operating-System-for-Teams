import { Router } from 'express';
import { calendarController } from './calendar.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { CreateCalendarEventSchema } from '@teamos/shared';

export const calendarRouter = Router({ mergeParams: true });

calendarRouter.get(
  '/workspaces/:workspaceId/calendar',
  authenticate,
  calendarController.getUnifiedCalendar
);

calendarRouter.get(
  '/workspaces/:workspaceId/calendar/free-busy',
  authenticate,
  calendarController.getFreeBusy
);

calendarRouter.post(
  '/workspaces/:workspaceId/calendar/events',
  authenticate,
  validate(CreateCalendarEventSchema),
  calendarController.createEvent
);

calendarRouter.delete(
  '/workspaces/:workspaceId/calendar/events/:id',
  authenticate,
  calendarController.deleteEvent
);
