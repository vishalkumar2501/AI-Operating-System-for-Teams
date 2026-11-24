import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { initRealtimeServer } from './modules/realtime/realtime.server';

async function startServer(): Promise<void> {
  // Verify infrastructure is reachable before accepting traffic.
  // Fail loudly on startup rather than serving broken requests.
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connection established');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to PostgreSQL — aborting startup');
    process.exit(1);
  }

  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connection established');
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, 'Failed to connect to Redis — continuing in standalone mode without Redis cluster');
  }

  const httpServer = http.createServer(app);
  await initRealtimeServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        url: `http://localhost:${env.PORT}/api/v1/health`,
      },
      '🚀 TeamOS API server is running with Realtime Socket.IO'
    );
  });

  // ---------------------------------------------------------------------------
  // Graceful shutdown — finish in-flight requests before closing connections
  // ---------------------------------------------------------------------------
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — draining connections');
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      logger.info('All connections closed — process exiting');
      process.exit(0);
    });

    // Force-exit if shutdown takes longer than 10 s (stuck DB query, etc.)
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error({ err }, 'Unexpected error during startup');
  process.exit(1);
});
