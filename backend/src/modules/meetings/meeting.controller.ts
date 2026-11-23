import { Request, Response, NextFunction } from 'express';
import { meetingService } from './meeting.service';
import { MeetingStatus } from '@teamos/shared';

export class MeetingController {
  async getMeetings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { from, to, status, projectId } = req.query;

      const meetings = await meetingService.getMeetings(workspaceId, {
        from: from as string | undefined,
        to: to as string | undefined,
        status: status as MeetingStatus | undefined,
        projectId: projectId as string | undefined,
      });

      res.status(200).json({ success: true, data: meetings });
    } catch (err) {
      next(err);
    }
  }

  async getMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;

      const meeting = await meetingService.getMeeting(meetingId, workspaceId);
      res.status(200).json({ success: true, data: meeting });
    } catch (err) {
      next(err);
    }
  }

  async createMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const organizerId = req.user!.id;

      const meeting = await meetingService.createMeeting(workspaceId, organizerId, req.body);
      res.status(201).json({ success: true, data: meeting });
    } catch (err) {
      next(err);
    }
  }

  async updateMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;

      const updated = await meetingService.updateMeeting(meetingId, workspaceId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;

      await meetingService.deleteMeeting(meetingId, workspaceId);
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }

  async updateRsvp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;
      const userId = req.user!.id;

      const result = await meetingService.updateRsvp(meetingId, workspaceId, userId, req.body.rsvp);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async uploadRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;
      const file = req.file;

      const transcript = await meetingService.triggerTranscription(meetingId, workspaceId, {
        audioFilePath: file?.path,
        customText: req.body?.customText,
      });

      res.status(200).json({ success: true, data: transcript });
    } catch (err) {
      next(err);
    }
  }

  async convertActions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const meetingId = req.params['meetingId'] as string;
      const userId = req.user!.id;

      const items = req.body.items || [];
      const createdTasks = await meetingService.convertActions(
        meetingId,
        workspaceId,
        userId,
        items
      );

      res.status(201).json({ success: true, data: createdTasks });
    } catch (err) {
      next(err);
    }
  }
}

export const meetingController = new MeetingController();
