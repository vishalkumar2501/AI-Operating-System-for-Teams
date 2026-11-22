import { prisma } from '../../lib/prisma';
import type { CreateCommentInput } from './comment.schema';

export const commentRepository = {
  async findById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            number: true,
            title: true,
            workspaceId: true,
            projectId: true,
            project: { select: { key: true } },
          },
        },
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  },

  async findByTaskId(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  async create(taskId: string, authorId: string, data: CreateCommentInput) {
    return prisma.comment.create({
      data: {
        taskId,
        authorId,
        body: data.body,
        mentions: data.mentions ?? [],
        parentCommentId: data.parentCommentId ?? null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.comment.delete({
      where: { id },
    });
  },
};
