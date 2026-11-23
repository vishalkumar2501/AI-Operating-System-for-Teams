import { Router } from 'express';
import { searchController } from './search.controller';
import { authenticate } from '../../middleware/authenticate';

export const searchRouter = Router({ mergeParams: true });

searchRouter.get('/workspaces/:workspaceId/search', authenticate, searchController.search);
