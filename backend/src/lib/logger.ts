import pino from 'pino';
import { env } from '../config/env';

// pino-pretty gives us human-readable output in development.
// In production we emit raw JSON for structured log aggregation (Datadog, GCP Logging, etc.).
export const logger = pino(
  {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Redact sensitive fields that might leak into log lines
    redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password'],
  },
  env.NODE_ENV !== 'production'
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      })
    : undefined
);
