import { prisma } from '../../lib/prisma';

export const dependencyRepository = {
  async findById(id: string) {
    return prisma.taskDependency.findUnique({
      where: { id },
      include: {
        task: {
          select: { id: true, projectId: true, title: true, status: true, workspaceId: true },
        },
        dependsOnTask: { select: { id: true, projectId: true, title: true, status: true } },
      },
    });
  },

  async findExisting(taskId: string, dependsOnTaskId: string) {
    return prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnTaskId: {
          taskId,
          dependsOnTaskId,
        },
      },
    });
  },

  async findByProjectId(projectId: string) {
    return prisma.taskDependency.findMany({
      where: {
        task: { projectId, deletedAt: null },
        dependsOnTask: { projectId, deletedAt: null },
      },
      include: {
        task: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            priority: true,
            estimate: true,
            assigneeId: true,
          },
        },
        dependsOnTask: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            priority: true,
            estimate: true,
          },
        },
      },
    });
  },

  async getIncompleteBlockers(taskId: string) {
    return prisma.taskDependency.findMany({
      where: {
        taskId,
        dependsOnTask: {
          deletedAt: null,
          status: { not: 'DONE' },
        },
      },
      include: {
        dependsOnTask: { select: { id: true, number: true, title: true, status: true } },
      },
    });
  },

  async getDependents(dependsOnTaskId: string) {
    return prisma.taskDependency.findMany({
      where: {
        dependsOnTaskId,
        task: { deletedAt: null },
      },
      include: {
        task: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            workspaceId: true,
            project: { select: { key: true } },
            subscribers: true,
          },
        },
      },
    });
  },

  async create(taskId: string, dependsOnTaskId: string) {
    return prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
        type: 'BLOCKS',
      },
      include: {
        task: { select: { id: true, number: true, title: true, status: true, workspaceId: true } },
        dependsOnTask: { select: { id: true, number: true, title: true, status: true } },
      },
    });
  },

  async delete(id: string) {
    return prisma.taskDependency.delete({
      where: { id },
    });
  },
};
