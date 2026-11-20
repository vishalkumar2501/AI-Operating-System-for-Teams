import { taskRepository } from './task.repository';
import { projectRepository } from '../projects/project.repository';
import { notificationService } from '../notifications/notification.service';
import { createAuditLog } from '../audit/audit.service';
import { createHttpError } from '../../middleware/errorHandler';
import type { CreateTaskInput, UpdateTaskInput, TaskFilterQuery } from './task.schema';

export const taskService = {
  async createTask(projectId: string, userId: string, data: CreateTaskInput) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw createHttpError(404, 'NOT_FOUND', 'Project not found');
    }

    if (data.parentTaskId) {
      const parent = await taskRepository.findById(data.parentTaskId);
      if (!parent || parent.projectId !== projectId) {
        throw createHttpError(400, 'INVALID_PARENT', 'Parent task must belong to the same project');
      }
    }

    const task = await taskRepository.create(projectId, project.workspaceId, userId, data);

    await createAuditLog({
      workspaceId: project.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: task.id,
      after: task as unknown as Record<string, unknown>,
    });

    // Notify assignee if assigned to someone else
    if (data.assigneeId && data.assigneeId !== userId) {
      await notificationService.notify({
        userId: data.assigneeId,
        type: 'TASK_ASSIGNED',
        payload: {
          taskId: task.id,
          taskKey: `${project.key}-${task.number}`,
          taskTitle: task.title,
          assignedBy: userId,
        },
      });
    }

    return task;
  },

  async getTaskById(taskId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }
    return task;
  },

  async getProjectTasks(projectId: string, filters: TaskFilterQuery) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw createHttpError(404, 'NOT_FOUND', 'Project not found');
    }
    return taskRepository.findByProjectId(projectId, filters);
  },

  async getMyTasks(userId: string, workspaceId?: string) {
    return taskRepository.findMyTasks(userId, workspaceId);
  },

  async updateTask(taskId: string, userId: string, data: UpdateTaskInput) {
    const existing = await taskRepository.findById(taskId);
    if (!existing) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    const updated = await taskRepository.update(taskId, data);

    // Write audit log
    await createAuditLog({
      workspaceId: existing.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: data.status && data.status !== existing.status ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: taskId,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    // Notify all subscribers except the actor who made the change
    const subscriberIds = existing.subscribers
      .map((s) => s.userId)
      .filter((id) => id !== userId);

    if (subscriberIds.length > 0) {
      const changeDescriptions: string[] = [];
      if (data.status && data.status !== existing.status) {
        changeDescriptions.push(`status changed to ${data.status}`);
      }
      if (data.dueDate !== undefined && data.dueDate !== (existing.dueDate?.toISOString() ?? null)) {
        changeDescriptions.push(`due date updated`);
      }
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        changeDescriptions.push(`assignee updated`);
      }
      if (data.priority && data.priority !== existing.priority) {
        changeDescriptions.push(`priority changed to ${data.priority}`);
      }

      const summary = changeDescriptions.length > 0
        ? changeDescriptions.join(', ')
        : 'task details updated';

      await notificationService.notifyMultiple(subscriberIds, 'TASK_UPDATED', {
        taskId: existing.id,
        taskKey: `${existing.project.key}-${existing.number}`,
        taskTitle: existing.title,
        updatedBy: userId,
        summary,
      });
    }

    return updated;
  },

  async addSubscriber(taskId: string, userId: string, targetUserId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    const subscriber = await taskRepository.addSubscriber(taskId, targetUserId);

    // Notify user if someone else subscribed them
    if (targetUserId !== userId) {
      await notificationService.notify({
        userId: targetUserId,
        type: 'TASK_SUBSCRIBED',
        payload: {
          taskId: task.id,
          taskKey: `${task.project.key}-${task.number}`,
          taskTitle: task.title,
          subscribedBy: userId,
        },
      });
    }

    return subscriber;
  },

  async removeSubscriber(taskId: string, targetUserId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    await taskRepository.removeSubscriber(taskId, targetUserId);
    return { success: true };
  },

  async addAttachment(
    taskId: string,
    userId: string,
    file: { filename: string; originalname: string; size: number; mimetype: string },
  ) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    const fileUrl = `/uploads/${file.filename}`;
    const attachment = await taskRepository.addAttachment(taskId, {
      fileUrl,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    });

    await createAuditLog({
      workspaceId: task.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'TASK_ATTACHMENT_ADDED',
      entityType: 'TASK',
      entityId: taskId,
      after: attachment as unknown as Record<string, unknown>,
    });

    return attachment;
  },

  async removeAttachment(attachmentId: string, userId: string) {
    const attachment = await taskRepository.findAttachmentById(attachmentId);
    if (!attachment) {
      throw createHttpError(404, 'NOT_FOUND', 'Attachment not found');
    }

    await taskRepository.removeAttachment(attachmentId);

    if (attachment.taskId) {
      const task = await taskRepository.findById(attachment.taskId);
      if (task) {
        await createAuditLog({
          workspaceId: task.workspaceId,
          actorType: 'USER',
          actorId: userId,
          action: 'TASK_ATTACHMENT_REMOVED',
          entityType: 'TASK',
          entityId: task.id,
          before: attachment as unknown as Record<string, unknown>,
        });
      }
    }

    return { success: true };
  },

  async deleteTask(taskId: string, userId: string) {
    const existing = await taskRepository.findById(taskId);
    if (!existing) {
      throw createHttpError(404, 'NOT_FOUND', 'Task not found');
    }

    const deleted = await taskRepository.softDelete(taskId);

    await createAuditLog({
      workspaceId: existing.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: taskId,
      before: existing as unknown as Record<string, unknown>,
    });

    return deleted;
  },
};
