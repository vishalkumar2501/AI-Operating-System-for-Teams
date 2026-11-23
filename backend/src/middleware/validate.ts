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
    // Cast is safe: Zod has already parsed and coerced the values
    req.query = result.data as typeof req.query;
    next();
  };
}
