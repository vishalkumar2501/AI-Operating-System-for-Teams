import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { CreateCommentSchema } from './comment.schema';

export const commentRouter = Router();

// Task comments endpoints
commentRouter.get('/tasks/:id/comments', authenticate, commentController.getComments);
commentRouter.post(
  '/tasks/:id/comments',
  authenticate,
  validate(CreateCommentSchema),
  commentController.createComment
);
commentRouter.delete(
  '/tasks/:id/comments/:commentId',
  authenticate,
  commentController.deleteComment
);
commentRouter.delete('/comments/:id', authenticate, commentController.deleteComment);
