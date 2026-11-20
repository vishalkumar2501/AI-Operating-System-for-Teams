import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import type { TaskFilterQuery } from './task.schema';

export const taskController = {
  async getProjectTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const filters = req.query as unknown as TaskFilterQuery;
      const result = await taskService.getProjectTasks(projectId, filters);
      res.status(200).json({
        success: true,
        data: result.tasks,
        meta: { nextCursor: result.nextCursor },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query['workspaceId'] as string | undefined;
      const tasks = await taskService.getMyTasks(req.user!.id, workspaceId);
      res.status(200).json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  },

  async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const task = await taskService.getTaskById(id);
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const task = await taskService.createTask(projectId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const task = await taskService.updateTask(id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await taskService.deleteTask(id, req.user!.id);
      res.status(200).json({ success: true, data: { message: 'Task deleted successfully' } });
    } catch (err) {
      next(err);
    }
  },

  async addSubscriber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const targetUserId = (req.body.userId as string) || req.user!.id;
      const subscriber = await taskService.addSubscriber(id, req.user!.id, targetUserId);
      res.status(201).json({ success: true, data: subscriber });
    } catch (err) {
      next(err);
    }
  },

  async removeSubscriber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const userId = req.params['userId'] as string;
      await taskService.removeSubscriber(id, userId);
      res.status(200).json({ success: true, data: { message: 'Subscriber removed' } });
    } catch (err) {
      next(err);
    }
  },

  async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'FILE_MISSING', message: 'No file was uploaded' },
        });
        return;
      }
      const attachment = await taskService.addAttachment(id, req.user!.id, req.file);
      res.status(201).json({ success: true, data: attachment });
    } catch (err) {
      next(err);
    }
  },

  async deleteAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await taskService.removeAttachment(id, req.user!.id);
      res.status(200).json({ success: true, data: { message: 'Attachment deleted' } });
    } catch (err) {
      next(err);
    }
  },
};
