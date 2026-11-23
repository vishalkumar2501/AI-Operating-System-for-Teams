import { Request, Response, NextFunction } from 'express';
import { githubService } from './github.service';

export class GithubController {
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = (req.headers['x-github-event'] as string) || 'ping';
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      // In production Express, with raw body verification
      const rawPayload = JSON.stringify(req.body);
      const isValid = githubService.verifySignature(rawPayload, signature);

      if (!isValid) {
        res.status(401).json({ success: false, error: { message: 'Invalid webhook signature' } });
        return;
      }

      if (event === 'ping') {
        res.status(200).json({ success: true, message: 'pong' });
        return;
      }

      const result = await githubService.handleWebhookEvent(event, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { projectId, limit } = req.query;

      const activities = await githubService.getActivities(workspaceId, {
        projectId: projectId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({ success: true, data: activities });
    } catch (err) {
      next(err);
    }
  }
}

export const githubController = new GithubController();
