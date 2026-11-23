import { Request, Response, NextFunction } from 'express';
import { docService } from './doc.service';

export class DocController {
  async getDocs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { projectId } = req.query;

      const docs = await docService.getDocs(workspaceId, projectId as string | undefined);

      res.status(200).json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  }

  async getDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const docId = req.params['docId'] as string;

      const doc = await docService.getDoc(docId, workspaceId);
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  async createDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const authorId = req.user!.id;

      const doc = await docService.createDoc(authorId, workspaceId, req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  async updateDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const docId = req.params['docId'] as string;

      const updated = await docService.updateDoc(docId, workspaceId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteDoc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const docId = req.params['docId'] as string;

      await docService.deleteDoc(docId, workspaceId);
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }
}

export const docController = new DocController();
