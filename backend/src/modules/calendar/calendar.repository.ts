import { prisma } from '../../lib/prisma';
import { CalendarFeedItem, CreateCalendarEventDto } from '@teamos/shared';

export interface CalendarFeedOptions {
  from: Date;
  to: Date;
  userIds?: string[];
}

export class CalendarRepository {
  async getUnifiedFeed(
    workspaceId: string,
    options: CalendarFeedOptions
  ): Promise<CalendarFeedItem[]> {
    const { from, to, userIds } = options;

    // 1. Fetch Meetings
    const meetingWhere: any = {
      workspaceId,
      startsAt: { lte: to },
      endsAt: { gte: from },
    };
    if (userIds && userIds.length > 0) {
      meetingWhere.OR = [
        { organizerId: { in: userIds } },
        { participants: { some: { userId: { in: userIds } } } },
      ];
    }

    const meetings = await prisma.meeting.findMany({
      where: meetingWhere,
      include: {
        organizer: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    // 2. Fetch Tasks with due dates
    const taskWhere: any = {
      workspaceId,
      dueDate: {
        gte: from,
        lte: to,
      },
      deletedAt: null,
    };
    if (userIds && userIds.length > 0) {
      taskWhere.assigneeId = { in: userIds };
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { key: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // 3. Fetch explicit CalendarEvents (Internal / Google Synced)
    const eventWhere: any = {
      workspaceId,
      startsAt: { lte: to },
      endsAt: { gte: from },
    };
    if (userIds && userIds.length > 0) {
      eventWhere.userId = { in: userIds };
    }

    const events = await prisma.calendarEvent.findMany({
      where: eventWhere,
      orderBy: { startsAt: 'asc' },
    });

    // Map all into unified CalendarFeedItem format
    const feed: CalendarFeedItem[] = [];

    for (const m of meetings) {
      feed.push({
        id: `meeting-${m.id}`,
        type: 'MEETING',
        title: m.title,
        startsAt: m.startsAt.toISOString(),
        endsAt: m.endsAt.toISOString(),
        source: 'INTERNAL',
        referenceId: m.id,
        details: {
          status: m.status,
          assigneeName: m.organizer.name,
          meetingUrl: m.meetingUrl,
        },
      });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      const dueStart = new Date(t.dueDate);
      // Give task a 30 min block on calendar
      const dueEnd = new Date(dueStart.getTime() + 30 * 60 * 1000);

      feed.push({
        id: `task-${t.id}`,
        type: 'TASK_DUE',
        title: `[Due] ${t.project.key}-${t.number}: ${t.title}`,
        startsAt: dueStart.toISOString(),
        endsAt: dueEnd.toISOString(),
        source: 'INTERNAL',
        referenceId: t.id,
        details: {
          status: t.status,
          priority: t.priority,
          assigneeName: t.assignee?.name || null,
        },
      });
    }

    for (const e of events) {
      // Don't duplicate meetings that already produced calendar events
      if (e.meetingId && meetings.some((m) => m.id === e.meetingId)) {
        continue;
      }
      feed.push({
        id: `event-${e.id}`,
        type: 'CALENDAR_EVENT',
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        source: e.source as 'INTERNAL' | 'GOOGLE',
        referenceId: e.id,
      });
    }

    // Sort chronologically
    return feed.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  async createEvent(userId: string, workspaceId: string, data: CreateCalendarEventDto) {
    return prisma.calendarEvent.create({
      data: {
        userId,
        workspaceId,
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        taskId: data.taskId,
        meetingId: data.meetingId,
        source: data.source || 'INTERNAL',
      },
    });
  }

  async deleteEvent(id: string, userId: string) {
    return prisma.calendarEvent.deleteMany({
      where: { id, userId },
    });
  }
}

export const calendarRepository = new CalendarRepository();
