import { Request, Response, NextFunction } from 'express';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request so downstream handlers can read req.id as a string
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Assigns a unique ID to every request so logs and error responses can be
 * correlated across services. The ID is returned to the client as X-Request-Id
 * so they can include it in support requests.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Honour a request ID forwarded by a gateway/proxy; otherwise mint a fresh one
  const incomingId = req.headers['x-request-id'];
  req.id = typeof incomingId === 'string' ? incomingId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
