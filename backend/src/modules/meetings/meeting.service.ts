import { meetingRepository } from './meeting.repository';
import { transcriptService } from './transcript.service';
import { CreateMeetingDto, UpdateMeetingDto, ParticipantRsvp, MeetingStatus } from '@teamos/shared';
import { createHttpError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';

export class MeetingService {
  async getMeetings(
    workspaceId: string,
    options?: {
      from?: string;
      to?: string;
      status?: MeetingStatus;
      projectId?: string;
    }
  ) {
    const fromDate = options?.from ? new Date(options.from) : undefined;
    const toDate = options?.to ? new Date(options.to) : undefined;

    return meetingRepository.findByWorkspace(workspaceId, {
      from: fromDate,
      to: toDate,
      status: options?.status,
      projectId: options?.projectId,
    });
  }

  async getMeeting(id: string, workspaceId: string) {
    const meeting = await meetingRepository.findById(id);
    if (!meeting || meeting.workspaceId !== workspaceId) {
      throw createHttpError(404, 'NOT_FOUND', 'Meeting not found');
    }
    return meeting;
  }

  async createMeeting(workspaceId: string, organizerId: string, dto: CreateMeetingDto) {
    const meeting = await meetingRepository.create({
      workspaceId,
      organizerId,
      title: dto.title,
      description: dto.description,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      projectId: dto.projectId,
      meetingUrl: dto.meetingUrl,
      participantIds: dto.participantIds,
    });

    return meeting;
  }

  async updateMeeting(id: string, workspaceId: string, dto: UpdateMeetingDto) {
    await this.getMeeting(id, workspaceId);
    return meetingRepository.update(id, dto);
  }

  async deleteMeeting(id: string, workspaceId: string) {
    await this.getMeeting(id, workspaceId);
    return meetingRepository.delete(id);
  }

  async updateRsvp(meetingId: string, workspaceId: string, userId: string, rsvp: ParticipantRsvp) {
    await this.getMeeting(meetingId, workspaceId);
    return meetingRepository.updateRsvp(meetingId, userId, rsvp);
  }

  async triggerTranscription(
    meetingId: string,
    workspaceId: string,
    options?: { audioFilePath?: string; customText?: string }
  ) {
    await this.getMeeting(meetingId, workspaceId);
    return transcriptService.processAudioOrText({
      meetingId,
      workspaceId,
      audioFilePath: options?.audioFilePath,
      customText: options?.customText,
    });
  }

  async convertActions(
    meetingId: string,
    workspaceId: string,
    userId: string,
    items: Array<{
      title: string;
      description?: string;
      projectId?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }>
  ) {
    return transcriptService.convertActionItemsToTasks(meetingId, workspaceId, userId, items);
  }
}

export const meetingService = new MeetingService();
