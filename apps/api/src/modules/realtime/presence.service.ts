import { redis } from '../../lib/redis';
import type { PresenceUser } from '@teamos/shared';

/**
 * REDIS PRESENCE ARCHITECTURE:
 *
 * In a collaborative workspace like Lark/Linear, knowing who is online and who is
 * currently reading/editing a specific task prevents duplicate work and collision.
 *
 * We maintain two distinct levels of presence:
 * 1. Workspace-level presence: `presence:workspace:{workspaceId}` (Hash of online members)
 * 2. Task-level viewers: `viewers:task:{taskId}` (Hash of active drawer viewers)
 *
 * Heartbeats fire every 30 seconds from active browser tabs. Stale entries (>45s inactive)
 * are pruned automatically during reads to ensure offline tabs do not linger.
 */

const WORKSPACE_PRESENCE_PREFIX = 'presence:workspace:';
const TASK_VIEWERS_PREFIX = 'viewers:task:';
const STALE_THRESHOLD_MS = 45_000; // 45 seconds

export const presenceService = {
  /**
   * Records or updates a user's heartbeat in a workspace.
   */
  async recordWorkspaceHeartbeat(
    workspaceId: string,
    user: { id: string; name: string | null; email: string; avatarUrl: string | null }
  ): Promise<void> {
    const key = `${WORKSPACE_PRESENCE_PREFIX}${workspaceId}`;
    const entry: PresenceUser = {
      userId: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      avatarUrl: user.avatarUrl,
      lastActive: Date.now(),
    };

    await redis.hset(key, user.id, JSON.stringify(entry));
    // Set a rolling 2-hour key expiration to prevent orphan memory leaks if all users leave
    await redis.expire(key, 7200);
  },

  /**
   * Removes a user from workspace presence on disconnect.
   */
  async removeWorkspaceUser(workspaceId: string, userId: string): Promise<void> {
    const key = `${WORKSPACE_PRESENCE_PREFIX}${workspaceId}`;
    await redis.hdel(key, userId);
  },

  /**
   * Retrieves active, non-stale members currently online in the workspace.
   */
  async getWorkspacePresence(workspaceId: string): Promise<PresenceUser[]> {
    const key = `${WORKSPACE_PRESENCE_PREFIX}${workspaceId}`;
    const all = await redis.hgetall(key);
    const now = Date.now();
    const active: PresenceUser[] = [];
    const staleUserIds: string[] = [];

    for (const [userId, raw] of Object.entries(all)) {
      try {
        const user: PresenceUser = JSON.parse(raw);
        if (now - user.lastActive <= STALE_THRESHOLD_MS) {
          active.push(user);
        } else {
          staleUserIds.push(userId);
        }
      } catch {
        staleUserIds.push(userId);
      }
    }

    // Lazy cleanup of stale entries
    if (staleUserIds.length > 0) {
      await redis.hdel(key, ...staleUserIds);
    }

    return active;
  },

  /**
   * Registers a user as actively viewing a specific task detail drawer.
   */
  async addTaskViewer(
    taskId: string,
    user: { id: string; name: string | null; email: string; avatarUrl: string | null }
  ): Promise<void> {
    const key = `${TASK_VIEWERS_PREFIX}${taskId}`;
    const entry: PresenceUser = {
      userId: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      avatarUrl: user.avatarUrl,
      lastActive: Date.now(),
    };

    await redis.hset(key, user.id, JSON.stringify(entry));
    await redis.expire(key, 7200);
  },

  /**
   * Removes a user from task detail viewers.
   */
  async removeTaskViewer(taskId: string, userId: string): Promise<void> {
    const key = `${TASK_VIEWERS_PREFIX}${taskId}`;
    await redis.hdel(key, userId);
  },

  /**
   * Retrieves all users currently viewing the given task.
   */
  async getTaskViewers(taskId: string): Promise<PresenceUser[]> {
    const key = `${TASK_VIEWERS_PREFIX}${taskId}`;
    const all = await redis.hgetall(key);
    const now = Date.now();
    const active: PresenceUser[] = [];
    const staleUserIds: string[] = [];

    for (const [userId, raw] of Object.entries(all)) {
      try {
        const user: PresenceUser = JSON.parse(raw);
        if (now - user.lastActive <= STALE_THRESHOLD_MS) {
          active.push(user);
        } else {
          staleUserIds.push(userId);
        }
      } catch {
        staleUserIds.push(userId);
      }
    }

    if (staleUserIds.length > 0) {
      await redis.hdel(key, ...staleUserIds);
    }

    return active;
  },
};
