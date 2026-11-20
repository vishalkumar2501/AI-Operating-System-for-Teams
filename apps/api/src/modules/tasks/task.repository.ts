import { prisma } from '../../lib/prisma';
import type { CreateTaskInput, UpdateTaskInput, TaskFilterQuery } from './task.schema';
import type { TaskStatus, TaskPriority } from '@teamos/shared';

export const taskRepository = {
  async create(projectId: string, workspaceId: string, reporterId: string, data: CreateTaskInput) {
    return prisma.$transaction(async (tx) => {
      // Find highest number in this project to allocate the next sequential ticket number
      const highest = await tx.task.findFirst({
        where: { projectId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });

      const nextNumber = (highest?.number ?? 0) + 1;

      // Determine default position
      let position = data.position;
      if (!position) {
        const lastPosition = await tx.task.findFirst({
          where: { projectId, status: data.status as TaskStatus },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        position = (lastPosition?.position ?? 0) + 1000;
      }

      const task = await tx.task.create({
        data: {
          workspaceId,
          projectId,
          reporterId,
          number: nextNumber,
          title: data.title,
          description: data.description,
          status: data.status as TaskStatus,
          priority: data.priority as TaskPriority,
          assigneeId: data.assigneeId,
          parentTaskId: data.parentTaskId,
          startDate: data.startDate ? new Date(data.startDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          estimate: data.estimate,
          position,
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // Auto-subscribe reporter and assignee
      const subscribersToCreate = [
        { taskId: task.id, userId: reporterId },
        ...(data.assigneeId && data.assigneeId !== reporterId
          ? [{ taskId: task.id, userId: data.assigneeId }]
          : []),
      ];

      await tx.taskSubscriber.createMany({
        data: subscribersToCreate,
        skipDuplicates: true,
      });

      return task;
    });
  },

  async findById(id: string) {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, key: true, workspaceId: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subscribers: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        attachments: true,
        subtasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { number: 'asc' },
        },
        parentTask: {
          select: { id: true, number: true, title: true, status: true },
        },
      },
    });
  },

  async findByProjectId(projectId: string, filters: TaskFilterQuery) {
    const where: any = {
      projectId,
      deletedAt: null,
    };

    if (filters.status) {
      const statuses = filters.status.split(',') as TaskStatus[];
      where.status = { in: statuses };
    }

    if (filters.priority) {
      where.priority = filters.priority as TaskPriority;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = Number(filters.limit) || 50;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: {
            subtasks: { where: { deletedAt: null } },
            comments: true,
            attachments: true,
          },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (tasks.length > limit) {
      const nextItem = tasks.pop();
      nextCursor = nextItem!.id;
    }

    return { tasks, nextCursor };
  },

  async findMyTasks(userId: string, workspaceId?: string) {
    return prisma.task.findMany({
      where: {
        assigneeId: userId,
        deletedAt: null,
        ...(workspaceId ? { workspaceId } : {}),
      },
      include: {
        project: { select: { id: true, name: true, key: true, workspaceId: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: { subtasks: { where: { deletedAt: null } }, comments: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async update(id: string, data: UpdateTaskInput) {
    const isCompleted = data.status === 'DONE';

    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && {
          status: data.status as TaskStatus,
          completedAt: isCompleted ? new Date() : data.status ? null : undefined,
        }),
        ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.parentTaskId !== undefined && { parentTaskId: data.parentTaskId }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.completedAt !== undefined && {
          completedAt: data.completedAt ? new Date(data.completedAt) : null,
        }),
        ...(data.estimate !== undefined && { estimate: data.estimate }),
        ...(data.position !== undefined && { position: data.position }),
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subscribers: {
          select: { userId: true },
        },
      },
    });
  },

  async addSubscriber(taskId: string, userId: string) {
    return prisma.taskSubscriber.create({
      data: { taskId, userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  },

  async removeSubscriber(taskId: string, userId: string) {
    return prisma.taskSubscriber.deleteMany({
      where: { taskId, userId },
    });
  },

  async getSubscribers(taskId: string) {
    return prisma.taskSubscriber.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  },

  async addAttachment(
    taskId: string,
    data: { fileUrl: string; name: string; size: number; mime: string }
  ) {
    return prisma.attachment.create({
      data: {
        taskId,
        fileUrl: data.fileUrl,
        name: data.name,
        size: data.size,
        mime: data.mime,
      },
    });
  },

  async removeAttachment(id: string) {
    return prisma.attachment.delete({
      where: { id },
    });
  },

  async findAttachmentById(id: string) {
    return prisma.attachment.findUnique({
      where: { id },
    });
  },

  async softDelete(id: string) {
    return prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
