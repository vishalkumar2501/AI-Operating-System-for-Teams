import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createHttpError } from './errorHandler';

// Extend Express so downstream middleware and controllers can read the member
declare global {
  namespace Express {
    interface Request {
      workspaceMember?: {
        id: string;
        workspaceId: string;
        userId: string;
        role: WorkspaceRole;
      };
    }
  }
}

/**
 * Verifies that the authenticated user is an active member of the workspace
 * referenced by :workspaceId in the route params. Attaches the membership
 * record to req.workspaceMember so downstream middleware (requireRole) doesn't
 * need another DB round-trip.
 */
export async function requireWorkspaceMember(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params['workspaceId'] as string;

    if (!req.user) {
      return next(createHttpError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!member) {
      return next(createHttpError(403, 'FORBIDDEN', 'You are not a member of this workspace'));
    }

    req.workspaceMember = {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}
