import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';

function buildRedisClient(): Redis {
  let url = (env.REDIS_URL || 'redis://localhost:6379').trim();

  // If user accidentally copied the full CLI command e.g. "redis-cli --tls -u redis://..."
  const urlMatch = url.match(/(rediss?:\/\/[^\s"']+)/);
  if (urlMatch) {
    url = urlMatch[1];
  }

  // Upstash requires TLS encryption (rediss://)
  if (url.includes('upstash.io') && url.startsWith('redis://')) {
    url = url.replace('redis://', 'rediss://');
  }

  const isTls = url.startsWith('rediss://') || url.includes('upstash.io');

  const options: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false, // Upstash serverless compatibility
    lazyConnect: true,
    connectTimeout: 10000,
    ...(isTls && {
      tls: {
        rejectUnauthorized: false,
      },
    }),
  };

  const client = new Redis(url, options);

  client.on('error', (err) => {
    console.warn('[redis] connection warning:', err.message);
  });

  return client;
}

export const redis = buildRedisClient();
