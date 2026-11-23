import { Router } from 'express';
import { docController } from './doc.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { CreateDocSchema, UpdateDocSchema } from '@teamos/shared';

export const docRouter = Router({ mergeParams: true });

docRouter.get('/workspaces/:workspaceId/docs', authenticate, docController.getDocs);

docRouter.post(
  '/workspaces/:workspaceId/docs',
  authenticate,
  validate(CreateDocSchema),
  docController.createDoc
);

docRouter.get('/workspaces/:workspaceId/docs/:docId', authenticate, docController.getDoc);

docRouter.patch(
  '/workspaces/:workspaceId/docs/:docId',
  authenticate,
  validate(UpdateDocSchema),
  docController.updateDoc
);

docRouter.delete('/workspaces/:workspaceId/docs/:docId', authenticate, docController.deleteDoc);
