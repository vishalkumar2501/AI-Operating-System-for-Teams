import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service';

export const commentController = {
  async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params['id'] as string;
      const comments = await commentService.getCommentsByTaskId(taskId);
      res.status(200).json({ success: true, data: comments });
    } catch (err) {
      next(err);
    }
  },

  async createComment(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params['id'] as string;
      const comment = await commentService.createComment(taskId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  },

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = (req.params['commentId'] || req.params['id']) as string;
      const result = await commentService.deleteComment(commentId, req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
