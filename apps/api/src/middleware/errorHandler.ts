import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Shapes every thrown error into the standard API envelope:
 *   { success: false, error: { code, message, details? } }
 *
 * We distinguish between expected operational errors and unexpected programmer
 * errors. The former get specific codes; the latter get INTERNAL_ERROR so we
 * never leak internals to callers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod validation failures — shape them into user-friendly field errors
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Prisma unique constraint violations (duplicate email, duplicate slug, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = (err.meta?.target as string[]) ?? [];
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with the same ${fields.join(', ')} already exists`,
      },
    });
    return;
  }

  // 404 — typically thrown explicitly by handlers
  if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message || 'Resource not found',
      },
    });
    return;
  }

  // Known API errors with an explicit status code set by our services
  if (err.statusCode && err.statusCode < 600) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? 'CLIENT_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Anything else is an unexpected server error
  logger.error(
    {
      err,
      requestId: req.id,
      path: req.path,
      method: req.method,
    },
    'Unhandled server error'
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      // Only expose stack traces during local development to avoid leaking internals
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/** Convenience factory so services can throw typed HTTP errors. */
export function createHttpError(statusCode: number, code: string, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
