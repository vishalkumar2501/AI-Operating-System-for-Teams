import { Request, Response, NextFunction, RequestHandler } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { createHttpError } from './errorHandler';

/**
 * Higher-order middleware factory. Wraps a route with a role gate that checks
 * req.workspaceMember.role (populated by requireWorkspaceMember upstream).
 *
 * Usage:
 *   router.post('/invites', authenticate, requireWorkspaceMember, requireRole('ADMIN', 'OWNER'), controller)
 */
export function requireRole(...allowedRoles: WorkspaceRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      return next(
        createHttpError(403, 'FORBIDDEN', 'Workspace membership check must run before role check')
      );
    }

    if (!allowedRoles.includes(req.workspaceMember.role)) {
      return next(
        createHttpError(
          403,
          'FORBIDDEN',
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
