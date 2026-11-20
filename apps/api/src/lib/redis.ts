import Redis from 'ioredis';
import { env } from '../config/env';

// Single Redis connection shared by the whole process.
// ioredis auto-reconnects, so there's no need for manual retry logic here.
export const redis = new Redis(env.REDIS_URL, {
  // Disable the default retry on ECONNREFUSED so a misconfigured URL surfaces
  // as a startup error rather than silently retrying forever.
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // connect explicitly in server.ts so we can catch errors
});

redis.on('error', (err) => {
  // Errors after startup are logged but don't crash the process;
  // ioredis will reconnect automatically.
  console.error('[redis] connection error:', err.message);
});
