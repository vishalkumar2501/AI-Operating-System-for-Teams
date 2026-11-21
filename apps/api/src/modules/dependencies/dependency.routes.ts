import { Router } from 'express';
import { dependencyController } from './dependency.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AddDependencySchema } from './dependency.schema';

export const dependencyRouter = Router();

// Task dependencies management
dependencyRouter.post(
  '/tasks/:id/dependencies',
  authenticate,
  validate(AddDependencySchema),
  dependencyController.addDependency
);

dependencyRouter.delete(
  '/tasks/:id/dependencies/:depId',
  authenticate,
  dependencyController.removeDependency
);

dependencyRouter.delete('/dependencies/:id', authenticate, dependencyController.removeDependency);

// Project graph & critical path analysis
dependencyRouter.get('/projects/:id/graph', authenticate, dependencyController.getProjectGraph);

dependencyRouter.get(
  '/projects/:id/critical-path',
  authenticate,
  dependencyController.getCriticalPath
);
