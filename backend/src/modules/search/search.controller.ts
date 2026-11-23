import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params['workspaceId'] as string;
      const { q, entityTypes, limit } = req.query;

      const types = entityTypes
        ? typeof entityTypes === 'string'
          ? (entityTypes.split(',').map((t) => t.trim()) as any)
          : (entityTypes as any)
        : undefined;

      const results = await searchService.hybridSearch({
        workspaceId,
        query: (q as string) || '',
        entityTypes: types,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
