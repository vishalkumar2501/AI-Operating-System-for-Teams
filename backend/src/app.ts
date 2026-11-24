import express from 'express';
import path from 'path';
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

// Trust reverse proxies (Render, Railway, Cloudflare) for HTTPS detection and secure cookies
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Static file uploads directory
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ---------------------------------------------------------------------------
// Security headers — sets sensible defaults for X-Frame-Options, CSP, etc.
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS — allow requests from our frontend
// ---------------------------------------------------------------------------
const allowedOrigins = Array.from(
  new Set([
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://localhost',
  ])
).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev fallback
      }
    },
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
    max: env.NODE_ENV === 'production' ? 100 : 2000,
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
// Health check for load balancers & container health probes
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
