import { prisma } from '../../lib/prisma';
import { MeetingStatus, ParticipantRsvp, TranscriptStatus } from '@prisma/client';
import { UpdateMeetingDto } from '@teamos/shared';

export interface CreateMeetingInput {
  workspaceId: string;
  organizerId: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  projectId?: string | null;
  meetingUrl?: string | null;
  participantIds?: string[];
}

export class MeetingRepository {
  async findByWorkspace(
    workspaceId: string,
    options?: {
      from?: Date;
      to?: Date;
      status?: MeetingStatus;
      projectId?: string;
    }
  ) {
    const where: any = { workspaceId };

    if (options?.projectId) {
      where.projectId = options.projectId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.from || options?.to) {
      where.startsAt = {};
      if (options.from) where.startsAt.gte = options.from;
      if (options.to) where.startsAt.lte = options.to;
    }

    return prisma.meeting.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, key: true } },
        organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        transcript: {
          select: {
            id: true,
            status: true,
            summary: true,
            actionItems: true,
            createdAt: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, key: true } },
        organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        transcript: {
          include: {
            segments: {
              orderBy: { startMs: 'asc' },
            },
          },
        },
      },
    });
  }

  async create(data: CreateMeetingInput) {
    const allParticipantIds = Array.from(
      new Set([data.organizerId, ...(data.participantIds || [])])
    );

    return prisma.$transaction(async (tx) => {
      // 1. Create meeting
      const meeting = await tx.meeting.create({
        data: {
          workspaceId: data.workspaceId,
          organizerId: data.organizerId,
          title: data.title,
          description: data.description,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          projectId: data.projectId,
          meetingUrl: data.meetingUrl,
          participants: {
            create: allParticipantIds.map((userId) => ({
              userId,
              rsvp: userId === data.organizerId ? ParticipantRsvp.ACCEPTED : ParticipantRsvp.PENDING,
            })),
          },
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
      });

      // 2. Automatically create calendar events for participants
      await tx.calendarEvent.createMany({
        data: allParticipantIds.map((userId) => ({
          userId,
          workspaceId: data.workspaceId,
          title: meeting.title,
          description: meeting.description,
          startsAt: meeting.startsAt,
          endsAt: meeting.endsAt,
          meetingId: meeting.id,
          source: 'INTERNAL',
        })),
      });

      return meeting;
    });
  }

  async update(id: string, data: UpdateMeetingDto) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) updateData.endsAt = new Date(data.endsAt);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl;
    if (data.recordingUrl !== undefined) updateData.recordingUrl = data.recordingUrl;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.meeting.update({
        where: { id },
        data: updateData,
        include: {
          project: { select: { id: true, name: true, key: true } },
          organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          transcript: true,
        },
      });

      // Synchronize linked calendar events if timing or title changed
      if (updateData.startsAt || updateData.endsAt || updateData.title || updateData.description) {
        await tx.calendarEvent.updateMany({
          where: { meetingId: id },
          data: {
            ...(updateData.title && { title: updateData.title }),
            ...(updateData.description !== undefined && { description: updateData.description }),
            ...(updateData.startsAt && { startsAt: updateData.startsAt }),
            ...(updateData.endsAt && { endsAt: updateData.endsAt }),
          },
        });
      }

      return updated;
    });
  }

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.calendarEvent.deleteMany({ where: { meetingId: id } });
      return tx.meeting.delete({ where: { id } });
    });
  }

  async updateRsvp(meetingId: string, userId: string, rsvp: ParticipantRsvp) {
    return prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: { meetingId, userId },
      },
      create: {
        meetingId,
        userId,
        rsvp,
      },
      update: {
        rsvp,
      },
    });
  }

  async saveTranscript(
    meetingId: string,
    transcriptData: {
      rawText: string;
      summary?: string | null;
      actionItems?: any;
      status: TranscriptStatus;
      segments?: Array<{
        speakerName?: string | null;
        speakerId?: string | null;
        startMs: number;
        endMs: number;
        text: string;
      }>;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Upsert transcript
      const transcript = await tx.transcript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          rawText: transcriptData.rawText,
          summary: transcriptData.summary,
          actionItems: transcriptData.actionItems || [],
          status: transcriptData.status,
        },
        update: {
          rawText: transcriptData.rawText,
          summary: transcriptData.summary,
          actionItems: transcriptData.actionItems || [],
          status: transcriptData.status,
        },
      });

      // If segments provided, replace segments
      if (transcriptData.segments && transcriptData.segments.length > 0) {
        await tx.transcriptSegment.deleteMany({
          where: { transcriptId: transcript.id },
        });

        await tx.transcriptSegment.createMany({
          data: transcriptData.segments.map((seg) => ({
            transcriptId: transcript.id,
            speakerName: seg.speakerName,
            speakerId: seg.speakerId,
            startMs: seg.startMs,
            endMs: seg.endMs,
            text: seg.text,
          })),
        });
      }

      return tx.transcript.findUnique({
        where: { id: transcript.id },
        include: { segments: { orderBy: { startMs: 'asc' } } },
      });
    });
  }
}

export const meetingRepository = new MeetingRepository();
