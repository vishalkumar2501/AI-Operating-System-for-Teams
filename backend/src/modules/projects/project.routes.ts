import { Router } from 'express';
import { projectController } from './project.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireWorkspaceMember } from '../../middleware/requireWorkspaceMember';
import { validate } from '../../middleware/validate';
import { CreateProjectSchema, UpdateProjectSchema } from './project.schema';

export const projectRouter = Router({ mergeParams: true });

// Workspace scoped project list & create
projectRouter.get(
  '/workspaces/:workspaceId/projects',
  authenticate,
  requireWorkspaceMember,
  projectController.getWorkspaceProjects
);

projectRouter.post(
  '/workspaces/:workspaceId/projects',
  authenticate,
  requireWorkspaceMember,
  validate(CreateProjectSchema),
  projectController.createProject
);

// Individual project operations
projectRouter.get('/projects/:id', authenticate, projectController.getProject);
projectRouter.patch(
  '/projects/:id',
  authenticate,
  validate(UpdateProjectSchema),
  projectController.updateProject
);
projectRouter.delete('/projects/:id', authenticate, projectController.deleteProject);
