import { commentRepository } from './comment.repository';
import { taskRepository } from '../tasks/task.repository';
import { notificationService } from '../notifications/notification.service';
import { createAuditLog } from '../audit/audit.service';
import { createHttpError } from '../../middleware/errorHandler';
import { prisma } from '../../lib/prisma';
import { emitCommentCreated, emitCommentDeleted } from '../realtime/realtime.server';
import type { CreateCommentInput } from './comment.schema';

export const commentService = {
  async getCommentsByTaskId(taskId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }
    return commentRepository.findByTaskId(taskId);
  },

  async createComment(taskId: string, authorId: string, data: CreateCommentInput) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    const comment = await commentRepository.create(taskId, authorId, data);

    // 1. Handle @mentions notifications
    const mentionedUserIds = new Set<string>();
    if (data.mentions && data.mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          OR: [{ id: { in: data.mentions } }, { email: { in: data.mentions } }],
          memberships: { some: { workspaceId: task.workspaceId } },
        },
        select: { id: true },
      });

      for (const u of mentionedUsers) {
        if (u.id !== authorId) {
          mentionedUserIds.add(u.id);
        }
      }

      if (mentionedUserIds.size > 0) {
        await notificationService.notifyMultiple(Array.from(mentionedUserIds), 'TASK_MENTIONED', {
          taskId: task.id,
          taskKey: `${task.project.key}-${task.number}`,
          taskTitle: task.title,
          mentionedBy: comment.author.name || comment.author.email,
          commentSnippet: comment.body.slice(0, 100),
        });
      }
    }

    // 2. Notify other subscribers about the new comment (excluding author and users already notified via mention)
    const subscriberIds = task.subscribers
      .map((s) => s.userId)
      .filter((id) => id !== authorId && !mentionedUserIds.has(id));

    if (subscriberIds.length > 0) {
      await notificationService.notifyMultiple(subscriberIds, 'TASK_COMMENT_ADDED', {
        taskId: task.id,
        taskKey: `${task.project.key}-${task.number}`,
        taskTitle: task.title,
        authorName: comment.author.name || comment.author.email,
        commentSnippet: comment.body.slice(0, 100),
      });
    }

    // 3. Write Audit Log
    await createAuditLog({
      workspaceId: task.workspaceId,
      actorType: 'USER',
      actorId: authorId,
      action: 'TASK_COMMENT_ADDED',
      entityType: 'TASK',
      entityId: taskId,
      after: {
        commentId: comment.id,
        bodySnippet: comment.body.slice(0, 80),
      },
    });

    // 4. Emit Real-time Socket Event to all clients viewing this task (<300ms latency)
    emitCommentCreated(taskId, comment);

    return comment;
  },

  async deleteComment(commentId: string, userId: string) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw createHttpError(404, 'NOT_FOUND', 'Comment not found');
    }

    // Allow deletion if user is the comment author or workspace admin/owner
    if (comment.authorId !== userId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: comment.task.workspaceId,
            userId,
          },
        },
      });

      const canDelete = membership && (membership.role === 'OWNER' || membership.role === 'ADMIN');
      if (!canDelete) {
        throw createHttpError(
          403,
          'FORBIDDEN',
          'You do not have permission to delete this comment'
        );
      }
    }

    await commentRepository.delete(commentId);

    // Broadcast realtime deletion event
    emitCommentDeleted(comment.taskId, commentId);

    return { success: true };
  },
};
