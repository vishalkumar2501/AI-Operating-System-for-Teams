import { Router } from 'express';
import { aiController } from './ai.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AiChatSchema } from '@teamos/shared';

export const aiRouter = Router({ mergeParams: true });

aiRouter.post(
  '/workspaces/:workspaceId/ai/chat',
  authenticate,
  validate(AiChatSchema),
  aiController.chat
);

aiRouter.get(
  '/workspaces/:workspaceId/ai/risks',
  authenticate,
  aiController.getRisks
);

aiRouter.post(
  '/workspaces/:workspaceId/ai/actions/:actionId/approve',
  authenticate,
  aiController.approveAction
);

aiRouter.post(
  '/workspaces/:workspaceId/ai/actions/:actionId/reject',
  authenticate,
  aiController.rejectAction
);
