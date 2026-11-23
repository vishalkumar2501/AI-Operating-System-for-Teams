import { Router } from 'express';
import { meetingController } from './meeting.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { upload } from '../../middleware/upload';
import { CreateMeetingSchema, UpdateMeetingSchema, UpdateRsvpSchema } from '@teamos/shared';

export const meetingRouter = Router({ mergeParams: true });

meetingRouter.get('/workspaces/:workspaceId/meetings', authenticate, meetingController.getMeetings);

meetingRouter.post(
  '/workspaces/:workspaceId/meetings',
  authenticate,
  validate(CreateMeetingSchema),
  meetingController.createMeeting
);

meetingRouter.get(
  '/workspaces/:workspaceId/meetings/:meetingId',
  authenticate,
  meetingController.getMeeting
);

meetingRouter.patch(
  '/workspaces/:workspaceId/meetings/:meetingId',
  authenticate,
  validate(UpdateMeetingSchema),
  meetingController.updateMeeting
);

meetingRouter.delete(
  '/workspaces/:workspaceId/meetings/:meetingId',
  authenticate,
  meetingController.deleteMeeting
);

meetingRouter.post(
  '/workspaces/:workspaceId/meetings/:meetingId/rsvp',
  authenticate,
  validate(UpdateRsvpSchema),
  meetingController.updateRsvp
);

meetingRouter.post(
  '/workspaces/:workspaceId/meetings/:meetingId/recording',
  authenticate,
  upload.single('recording'),
  meetingController.uploadRecording
);

meetingRouter.post(
  '/workspaces/:workspaceId/meetings/:meetingId/transcript/convert-actions',
  authenticate,
  meetingController.convertActions
);
