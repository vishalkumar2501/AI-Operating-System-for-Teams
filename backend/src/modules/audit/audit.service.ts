import { ActorType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

interface AuditLogData {
  workspaceId: string;
  actorType: 'USER' | 'AI_AGENT' | 'SYSTEM';
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
}

/**
 * Writes an immutable audit log entry.
 * Failures are logged but intentionally swallowed — a failed audit write
 * should never roll back the actual business operation. This is a "best-effort"
 * record for security and compliance purposes.
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  // Skip audit logs for the placeholder 'global' workspaceId used during registration
  // (the user has no workspace yet at that point)
  if (data.workspaceId === 'global') {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: data.workspaceId,
        actorType: data.actorType as ActorType,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before ? (data.before as any) : undefined,
        after: data.after ? (data.after as any) : undefined,
        ip: data.ip,
      },
    });
  } catch (err) {
    // Log the failure but don't re-throw — audit failures are non-fatal
    logger.warn({ err, action: data.action }, 'Failed to write audit log');
  }
}
