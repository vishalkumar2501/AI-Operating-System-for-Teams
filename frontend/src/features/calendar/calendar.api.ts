import { apiClient } from '@/lib/api';
import { CalendarFeedItem } from '@teamos/shared';

export interface FreeBusyResponse {
  date: string;
  workingHours: { start: string; end: string };
  busyCount: number;
  busyIntervals: Array<{ start: string; end: string }>;
  availableSlots: Array<{ start: string; end: string }>;
}

export const calendarApi = {
  async getUnifiedCalendar(
    workspaceId: string,
    params?: { from?: string; to?: string; users?: string }
  ): Promise<CalendarFeedItem[]> {
    const res = await apiClient.get<{ success: true; data: CalendarFeedItem[] }>(
      `/workspaces/${workspaceId}/calendar`,
      { params }
    );
    return res.data.data;
  },

  async getFreeBusy(
    workspaceId: string,
    params?: { date?: string; duration?: number; users?: string }
  ): Promise<FreeBusyResponse> {
    const res = await apiClient.get<{ success: true; data: FreeBusyResponse }>(
      `/workspaces/${workspaceId}/calendar/free-busy`,
      { params }
    );
    return res.data.data;
  },
};
