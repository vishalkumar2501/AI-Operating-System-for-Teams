import { Request, Response, NextFunction } from 'express';
import { dependencyService } from './dependency.service';

export const dependencyController = {
  async addDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params['id'] as string;
      const result = await dependencyService.addDependency(taskId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async removeDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const depId = (req.params['depId'] || req.params['id']) as string;
      const result = await dependencyService.removeDependency(depId, req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getProjectGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params['id'] as string;
      const graph = await dependencyService.getProjectGraph(projectId);
      res.status(200).json({ success: true, data: graph });
    } catch (err) {
      next(err);
    }
  },

  async getCriticalPath(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params['id'] as string;
      const criticalPath = await dependencyService.calculateCriticalPath(projectId);
      res.status(200).json({ success: true, data: criticalPath });
    } catch (err) {
      next(err);
    }
  },
};
