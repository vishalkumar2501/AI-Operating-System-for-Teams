import { Router } from 'express';
import { taskController } from './task.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate, validateQuery } from '../../middleware/validate';
import { upload } from '../../middleware/upload';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFilterQuerySchema,
  AddSubscriberSchema,
} from './task.schema';

export const taskRouter = Router({ mergeParams: true });

// Project scoped task operations
taskRouter.get(
  '/projects/:projectId/tasks',
  authenticate,
  validateQuery(TaskFilterQuerySchema),
  taskController.getProjectTasks,
);

taskRouter.post(
  '/projects/:projectId/tasks',
  authenticate,
  validate(CreateTaskSchema),
  taskController.createTask,
);

// My tasks across workspace
taskRouter.get('/tasks/my', authenticate, taskController.getMyTasks);

// Individual task operations
taskRouter.get('/tasks/:id', authenticate, taskController.getTask);
taskRouter.patch(
  '/tasks/:id',
  authenticate,
  validate(UpdateTaskSchema),
  taskController.updateTask,
);
taskRouter.delete('/tasks/:id', authenticate, taskController.deleteTask);

// Subscribers
taskRouter.post(
  '/tasks/:id/subscribers',
  authenticate,
  validate(AddSubscriberSchema),
  taskController.addSubscriber,
);
taskRouter.delete('/tasks/:id/subscribers/:userId', authenticate, taskController.removeSubscriber);

// Attachments
taskRouter.post(
  '/tasks/:id/attachments',
  authenticate,
  upload.single('file'),
  taskController.uploadAttachment,
);
taskRouter.delete('/attachments/:id', authenticate, taskController.deleteAttachment);
