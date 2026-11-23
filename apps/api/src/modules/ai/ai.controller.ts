import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';

export class AiController {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const userId = req.user!.id;
      const { prompt, context } = req.body;

      const result = await aiService.handleChat(workspaceId, userId, prompt, context);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { projectId } = req.query;

      const risks = await aiService.getRisks(workspaceId, projectId as string | undefined);
      res.status(200).json({ success: true, data: risks });
    } catch (err) {
      next(err);
    }
  }

  async approveAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actionId = req.params['actionId'] as string;
      const userId = req.user!.id;

      const result = await aiService.approveAction(actionId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async rejectAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actionId = req.params['actionId'] as string;
      const userId = req.user!.id;

      const result = await aiService.rejectAction(actionId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
