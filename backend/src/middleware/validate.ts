import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates req.body against the provided Zod schema.
 * Returns 422 with field-level error details on failure so clients know
 * exactly which fields to fix — no guesswork needed.
 */
export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }
    // Replace req.body with the coerced/transformed Zod output
    req.body = result.data;
    next();
  };
}

/**
 * Same as validate() but targets req.query. Useful for search/filter endpoints
 * that express their parameters in the query string.
 */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(result.error);
    }
    // In Express 5, req.query is a getter. Use Object.defineProperty to safely override.
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
