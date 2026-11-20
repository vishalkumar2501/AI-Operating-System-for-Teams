import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/index';

const app = express();

// ---------------------------------------------------------------------------
// Security headers — sets sensible defaults for X-Frame-Options, CSP, etc.
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS — only allow requests from our own frontend
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: [env.CLIENT_URL],
    credentials: true, // needed so the browser sends the refresh-token cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// ---------------------------------------------------------------------------
// General rate limit — broad protection against accidental loops and scrapers
// ---------------------------------------------------------------------------
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
    },
  })
);

// ---------------------------------------------------------------------------
// Body parsing — cap at 10 mb to prevent memory-bomb uploads
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Request tracing + structured HTTP logging
// ---------------------------------------------------------------------------
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    // Keep request IDs consistent between pino-http and our own requestId middleware
    genReqId: (req) => (req as express.Request).id,
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/v1', apiRouter);

// ---------------------------------------------------------------------------
// 404 — catch anything that didn't match a route above
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ---------------------------------------------------------------------------
// Global error handler — must be last and must have 4 arguments
// ---------------------------------------------------------------------------
app.use(errorHandler);

export { app };
