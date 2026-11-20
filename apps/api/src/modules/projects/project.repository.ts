import { prisma } from '../../lib/prisma';
import type { CreateProjectInput, UpdateProjectInput } from './project.schema';

export const projectRepository = {
  async findById(id: string) {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });
  },

  async findByKey(workspaceId: string, key: string) {
    return prisma.project.findFirst({
      where: { workspaceId, key, deletedAt: null },
    });
  },

  async findByWorkspaceId(workspaceId: string) {
    return prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(workspaceId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        workspaceId,
        name: data.name,
        key: data.key,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });
  },

  async update(id: string, data: UpdateProjectInput) {
    return prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.key && { key: data.key }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.targetDate !== undefined && {
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
        }),
      },
    });
  },

  async softDelete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
