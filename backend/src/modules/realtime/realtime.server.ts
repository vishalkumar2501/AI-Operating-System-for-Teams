import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redis } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { presenceService } from './presence.service';
import { SocketEvents } from '@teamos/shared';

let ioInstance: Server | null = null;

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface SocketData {
  user: AuthenticatedSocketUser;
  workspaces: Set<string>;
  tasks: Set<string>;
}

/**
 * Initializes the Socket.IO realtime server attached to Express HTTP server.
 * Uses Redis pub/sub adapter for zero-overhead horizontal clustering across instances.
 */
export async function initRealtimeServer(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Configure Redis adapter with duplicated connections
  try {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[realtime] Socket.IO Redis pub/sub adapter connected');
  } catch (err: any) {
    logger.warn(
      `[realtime] Redis adapter initialization warning (running in standalone mode): ${err.message}`
    );
  }

  // ---------------------------------------------------------------------------
  // Handshake JWT Authentication Middleware
  // Rejects unauthenticated connections before allocating socket resources.
  // ---------------------------------------------------------------------------
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

      if (!token) {
        return next(new Error('Authentication required: no access token provided'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        id?: string;
        sub?: string;
        email: string;
      };
      const userId = decoded.id || decoded.sub;
      if (!userId) {
        return next(new Error('Authentication failed: token missing user id'));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return next(new Error('Authentication failed: user not found'));
      }

      socket.data = {
        user,
        workspaces: new Set<string>(),
        tasks: new Set<string>(),
      } as SocketData;

      next();
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[realtime] Socket authentication error');
      next(
        new Error(`Authentication failed: ${err?.message || 'invalid or expired access token'}`)
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Connection & Room Management
  // ---------------------------------------------------------------------------
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthenticatedSocketUser;
    logger.debug(`[realtime] User connected: ${user.email} (socket id: ${socket.id})`);

    // 1. Join Workspace Room
    socket.on(SocketEvents.JOIN_WORKSPACE, async (workspaceId: string) => {
      try {
        if (!workspaceId) return;

        // Security check: verify workspace membership
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId: user.id,
            },
          },
        });

        if (!member) {
          socket.emit('error', { message: 'Unauthorized: not a member of this workspace' });
          return;
        }

        const roomName = `workspace:${workspaceId}`;
        await socket.join(roomName);
        (socket.data as SocketData).workspaces.add(workspaceId);

        // Record presence & broadcast updated presence list
        await presenceService.recordWorkspaceHeartbeat(workspaceId, user);
        const activeUsers = await presenceService.getWorkspacePresence(workspaceId);
        io.to(roomName).emit(SocketEvents.PRESENCE_UPDATE, { workspaceId, users: activeUsers });
      } catch (err: any) {
        logger.error(`[realtime] Error in join_workspace: ${err.message}`);
      }
    });

    // 2. Workspace Presence Heartbeat (called periodically by client)
    socket.on(SocketEvents.PRESENCE_HEARTBEAT, async (workspaceId: string) => {
      try {
        if (!workspaceId) return;
        await presenceService.recordWorkspaceHeartbeat(workspaceId, user);
        const activeUsers = await presenceService.getWorkspacePresence(workspaceId);
        io.to(`workspace:${workspaceId}`).emit(SocketEvents.PRESENCE_UPDATE, {
          workspaceId,
          users: activeUsers,
        });
      } catch (err: any) {
        logger.error(`[realtime] Error in presence heartbeat: ${err.message}`);
      }
    });

    // 3. Leave Workspace Room
    socket.on(SocketEvents.LEAVE_WORKSPACE, async (workspaceId: string) => {
      try {
        if (!workspaceId) return;
        const roomName = `workspace:${workspaceId}`;
        socket.leave(roomName);
        (socket.data as SocketData).workspaces.delete(workspaceId);

        await presenceService.removeWorkspaceUser(workspaceId, user.id);
        const activeUsers = await presenceService.getWorkspacePresence(workspaceId);
        io.to(roomName).emit(SocketEvents.PRESENCE_UPDATE, { workspaceId, users: activeUsers });
      } catch (err: any) {
        logger.error(`[realtime] Error in leave_workspace: ${err.message}`);
      }
    });

    // 4. Project Room (for live Kanban and task updates)
    socket.on(SocketEvents.JOIN_PROJECT, (projectId: string) => {
      if (projectId) socket.join(`project:${projectId}`);
    });

    socket.on(SocketEvents.LEAVE_PROJECT, (projectId: string) => {
      if (projectId) socket.leave(`project:${projectId}`);
    });

    // 5. Task Detail Room (for active viewers, typing indicators, and comments)
    socket.on(SocketEvents.JOIN_TASK, async (taskId: string) => {
      try {
        if (!taskId) return;
        const roomName = `task:${taskId}`;
        await socket.join(roomName);
        (socket.data as SocketData).tasks.add(taskId);

        await presenceService.addTaskViewer(taskId, user);
        const viewers = await presenceService.getTaskViewers(taskId);
        io.to(roomName).emit(SocketEvents.TASK_VIEWERS_UPDATE, { taskId, viewers });
      } catch (err: any) {
        logger.error(`[realtime] Error in join_task: ${err.message}`);
      }
    });

    socket.on(SocketEvents.LEAVE_TASK, async (taskId: string) => {
      try {
        if (!taskId) return;
        const roomName = `task:${taskId}`;
        socket.leave(roomName);
        (socket.data as SocketData).tasks.delete(taskId);

        await presenceService.removeTaskViewer(taskId, user.id);
        const viewers = await presenceService.getTaskViewers(taskId);
        io.to(roomName).emit(SocketEvents.TASK_VIEWERS_UPDATE, { taskId, viewers });
      } catch (err: any) {
        logger.error(`[realtime] Error in leave_task: ${err.message}`);
      }
    });

    // 6. Live Typing Indicator
    socket.on(SocketEvents.TASK_TYPING, (payload: { taskId: string; isTyping: boolean }) => {
      if (!payload?.taskId) return;
      socket.to(`task:${payload.taskId}`).emit(SocketEvents.USER_TYPING, {
        taskId: payload.taskId,
        userId: user.id,
        name: user.name || user.email.split('@')[0],
        isTyping: Boolean(payload.isTyping),
      });
    });

    // 7. Cleanup on Disconnect
    socket.on('disconnect', async () => {
      try {
        const data = socket.data as SocketData;

        // Cleanup task viewers
        for (const taskId of data.tasks) {
          await presenceService.removeTaskViewer(taskId, user.id);
          const viewers = await presenceService.getTaskViewers(taskId);
          io.to(`task:${taskId}`).emit(SocketEvents.TASK_VIEWERS_UPDATE, { taskId, viewers });
        }

        // Cleanup workspace presence
        for (const workspaceId of data.workspaces) {
          await presenceService.removeWorkspaceUser(workspaceId, user.id);
          const activeUsers = await presenceService.getWorkspacePresence(workspaceId);
          io.to(`workspace:${workspaceId}`).emit(SocketEvents.PRESENCE_UPDATE, {
            workspaceId,
            users: activeUsers,
          });
        }
      } catch (err: any) {
        logger.error(`[realtime] Error during disconnect cleanup: ${err.message}`);
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Accessor for the active Socket.IO server instance.
 */
export function getRealtimeServer(): Server | null {
  return ioInstance;
}

/**
 * Emits a real-time task update to all connected clients in the project and workspace.
 */
export function emitTaskUpdated(workspaceId: string, projectId: string, task: unknown): void {
  if (!ioInstance) return;
  ioInstance
    .to(`project:${projectId}`)
    .to(`workspace:${workspaceId}`)
    .emit(SocketEvents.TASK_UPDATED, task);
}

/**
 * Emits a real-time comment creation event to viewers of the task.
 */
export function emitCommentCreated(taskId: string, comment: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`task:${taskId}`).emit(SocketEvents.COMMENT_CREATED, comment);
}

/**
 * Emits a real-time comment deletion event to viewers of the task.
 */
export function emitCommentDeleted(taskId: string, commentId: string): void {
  if (!ioInstance) return;
  ioInstance.to(`task:${taskId}`).emit(SocketEvents.COMMENT_DELETED, { taskId, commentId });
}
