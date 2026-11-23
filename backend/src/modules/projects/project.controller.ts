import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';

export const projectController = {
  async getWorkspaceProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const projects = await projectService.getProjectsByWorkspace(workspaceId);
      res.status(200).json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  },

  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const project = await projectService.getProjectById(id);
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  },

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const project = await projectService.createProject(workspaceId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  },

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const project = await projectService.updateProject(id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  },

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      await projectService.deleteProject(id, req.user!.id);
      res.status(200).json({ success: true, data: { message: 'Project deleted successfully' } });
    } catch (err) {
      next(err);
    }
  },
};
