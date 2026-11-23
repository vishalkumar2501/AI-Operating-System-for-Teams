import { Router } from 'express';
import { githubController } from './github.controller';
import { authenticate } from '../../../middleware/authenticate';

export const githubRouter = Router({ mergeParams: true });

// Public webhook endpoint for GitHub
githubRouter.post('/webhooks/github', (req, res, next) => {
  githubController.handleWebhook(req, res, next);
});

// Authenticated activity feed endpoint
githubRouter.get(
  '/workspaces/:workspaceId/git-activity',
  authenticate,
  (req, res, next) => {
    githubController.getActivities(req, res, next);
  }
);
