import { calendarRepository } from './calendar.repository';
import { CreateCalendarEventDto, CalendarFeedItem } from '@teamos/shared';
import { prisma } from '../../lib/prisma';

export interface FreeBusySlot {
  start: string;
  end: string;
}

export class CalendarService {
  async getUnifiedCalendar(
    workspaceId: string,
    options: { from?: string; to?: string; userIds?: string[] }
  ): Promise<CalendarFeedItem[]> {
    const now = new Date();
    // Default to a 30-day window around current time if unspecified
    const from = options.from
      ? new Date(options.from)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = options.to
      ? new Date(options.to)
      : new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000);

    return calendarRepository.getUnifiedFeed(workspaceId, {
      from,
      to,
      userIds: options.userIds,
    });
  }

  /**
   * Free/Busy Slot Detection across team members for conflict-free scheduling
   */
  async findFreeBusy(
    workspaceId: string,
    userIds: string[],
    dateStr: string,
    durationMinutes: number = 30
  ) {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(9, 0, 0, 0); // 09:00 AM working hours start

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(18, 0, 0, 0); // 06:00 PM working hours end

    // Fetch all existing events and meetings during this day
    const feed = await calendarRepository.getUnifiedFeed(workspaceId, {
      from: startOfDay,
      to: endOfDay,
      userIds: userIds.length > 0 ? userIds : undefined,
    });

    // Extract intervals [start, end]
    const rawIntervals: Array<{ start: number; end: number }> = [];
    for (const item of feed) {
      const s = Math.max(new Date(item.startsAt).getTime(), startOfDay.getTime());
      const e = Math.min(new Date(item.endsAt).getTime(), endOfDay.getTime());
      if (s < e) {
        rawIntervals.push({ start: s, end: e });
      }
    }

    // Sort intervals
    rawIntervals.sort((a, b) => a.start - b.start);

    // Merge overlapping busy intervals
    const busyIntervals: Array<{ start: number; end: number }> = [];
    for (const interval of rawIntervals) {
      if (busyIntervals.length === 0) {
        busyIntervals.push(interval);
      } else {
        const last = busyIntervals[busyIntervals.length - 1];
        if (interval.start <= last.end) {
          last.end = Math.max(last.end, interval.end);
        } else {
          busyIntervals.push(interval);
        }
      }
    }

    // Invert busy intervals to find free slots of duration durationMinutes
    const slotDurationMs = durationMinutes * 60 * 1000;
    const availableSlots: FreeBusySlot[] = [];

    let cursor = startOfDay.getTime();
    for (const busy of busyIntervals) {
      if (busy.start - cursor >= slotDurationMs) {
        // We have a free window
        let freeStart = cursor;
        while (freeStart + slotDurationMs <= busy.start) {
          availableSlots.push({
            start: new Date(freeStart).toISOString(),
            end: new Date(freeStart + slotDurationMs).toISOString(),
          });
          freeStart += slotDurationMs;
        }
      }
      cursor = Math.max(cursor, busy.end);
    }

    // Final gap between last busy interval and endOfDay
    if (endOfDay.getTime() - cursor >= slotDurationMs) {
      let freeStart = cursor;
      while (freeStart + slotDurationMs <= endOfDay.getTime()) {
        availableSlots.push({
          start: new Date(freeStart).toISOString(),
          end: new Date(freeStart + slotDurationMs).toISOString(),
        });
        freeStart += slotDurationMs;
      }
    }

    return {
      date: dateStr,
      workingHours: {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
      },
      busyCount: busyIntervals.length,
      busyIntervals: busyIntervals.map((b) => ({
        start: new Date(b.start).toISOString(),
        end: new Date(b.end).toISOString(),
      })),
      availableSlots,
    };
  }

  async createEvent(userId: string, workspaceId: string, dto: CreateCalendarEventDto) {
    return calendarRepository.createEvent(userId, workspaceId, dto);
  }

  async deleteEvent(id: string, userId: string) {
    return calendarRepository.deleteEvent(id, userId);
  }
}

export const calendarService = new CalendarService();
