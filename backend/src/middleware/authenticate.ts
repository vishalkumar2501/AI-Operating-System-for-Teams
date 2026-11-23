import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { createHttpError } from './errorHandler';

export interface JwtPayload {
  id: string;
  email: string;
  role?: string;
}

// Extend Express so req.user is typed everywhere downstream
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Validates the Bearer token from the Authorization header and attaches the
 * decoded payload to req.user. Routes that call this middleware can trust that
 * req.user is populated; unauthenticated requests are rejected with 401.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(createHttpError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    next(createHttpError(401, 'UNAUTHORIZED', 'Invalid or expired access token'));
  }
}
