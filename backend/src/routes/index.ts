import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { workspaceRouter } from '../modules/workspaces/workspace.routes';
import { projectRouter } from '../modules/projects/project.routes';
import { taskRouter } from '../modules/tasks/task.routes';
import { dependencyRouter } from '../modules/dependencies/dependency.routes';
import { commentRouter } from '../modules/comments/comment.routes';
import { notificationRouter } from '../modules/notifications/notification.routes';
import { meetingRouter } from '../modules/meetings/meeting.routes';
import { calendarRouter } from '../modules/calendar/calendar.routes';
import { docRouter } from '../modules/docs/doc.routes';
import { githubRouter } from '../modules/integrations/github/github.routes';
import { searchRouter } from '../modules/search/search.routes';
import { aiRouter } from '../modules/ai/ai.routes';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const apiRouter = Router();

// ---------------------------------------------------------------------------
// Health check — a quick signal for load balancers and monitoring dashboards.
// It actively verifies both DB and Redis so a degraded dependency surfaces here
// rather than as a cascade of 500s on real endpoints.
// ---------------------------------------------------------------------------
apiRouter.get('/health', async (_req, res) => {
  let dbStatus = 'connected';
  let redisStatus = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Feature routes
// ---------------------------------------------------------------------------
apiRouter.use('/auth', authRouter);
apiRouter.use('/', workspaceRouter);
apiRouter.use('/', projectRouter);
apiRouter.use('/', taskRouter);
apiRouter.use('/', dependencyRouter);
apiRouter.use('/', commentRouter);
apiRouter.use('/', notificationRouter);
apiRouter.use('/', meetingRouter);
apiRouter.use('/', calendarRouter);
apiRouter.use('/', docRouter);
apiRouter.use('/', githubRouter);
apiRouter.use('/', searchRouter);
apiRouter.use('/', aiRouter);
