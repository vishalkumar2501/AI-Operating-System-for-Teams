import { apiClient } from '@/lib/api';
import {
  MeetingItem,
  CreateMeetingDto,
  UpdateMeetingDto,
  ParticipantRsvp,
  TranscriptItem,
} from '@teamos/shared';

export const meetingApi = {
  async getMeetings(
    workspaceId: string,
    params?: { from?: string; to?: string; status?: string; projectId?: string }
  ): Promise<MeetingItem[]> {
    const res = await apiClient.get<{ success: true; data: MeetingItem[] }>(
      `/workspaces/${workspaceId}/meetings`,
      { params }
    );
    return res.data.data;
  },

  async getMeeting(workspaceId: string, meetingId: string): Promise<MeetingItem> {
    const res = await apiClient.get<{ success: true; data: MeetingItem }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}`
    );
    return res.data.data;
  },

  async createMeeting(workspaceId: string, dto: CreateMeetingDto): Promise<MeetingItem> {
    const res = await apiClient.post<{ success: true; data: MeetingItem }>(
      `/workspaces/${workspaceId}/meetings`,
      dto
    );
    return res.data.data;
  },

  async updateMeeting(
    workspaceId: string,
    meetingId: string,
    dto: UpdateMeetingDto
  ): Promise<MeetingItem> {
    const res = await apiClient.patch<{ success: true; data: MeetingItem }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}`,
      dto
    );
    return res.data.data;
  },

  async deleteMeeting(workspaceId: string, meetingId: string): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/meetings/${meetingId}`);
  },

  async updateRsvp(
    workspaceId: string,
    meetingId: string,
    rsvp: ParticipantRsvp
  ): Promise<any> {
    const res = await apiClient.post(
      `/workspaces/${workspaceId}/meetings/${meetingId}/rsvp`,
      { rsvp }
    );
    return res.data.data;
  },

  async triggerTranscription(
    workspaceId: string,
    meetingId: string,
    options?: { file?: File; customText?: string }
  ): Promise<TranscriptItem> {
    if (options?.file) {
      const formData = new FormData();
      formData.append('recording', options.file);
      const res = await apiClient.post<{ success: true; data: TranscriptItem }>(
        `/workspaces/${workspaceId}/meetings/${meetingId}/recording`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data.data;
    } else {
      const res = await apiClient.post<{ success: true; data: TranscriptItem }>(
        `/workspaces/${workspaceId}/meetings/${meetingId}/recording`,
        { customText: options?.customText }
      );
      return res.data.data;
    }
  },

  async convertActions(
    workspaceId: string,
    meetingId: string,
    items: Array<{
      title: string;
      description?: string;
      projectId?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }>
  ): Promise<any[]> {
    const res = await apiClient.post<{ success: true; data: any[] }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcript/convert-actions`,
      { items }
    );
    return res.data.data;
  },
};
