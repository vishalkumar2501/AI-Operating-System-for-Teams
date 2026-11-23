import { prisma } from '../../lib/prisma';
import { CreateDocDto, UpdateDocDto } from '@teamos/shared';

export class DocRepository {
  async findByWorkspace(workspaceId: string, projectId?: string) {
    const where: any = { workspaceId, deletedAt: null };
    if (projectId) {
      where.projectId = projectId;
    }

    return prisma.doc.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, key: true } },
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.doc.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, key: true } },
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async create(authorId: string, workspaceId: string, data: CreateDocDto) {
    return prisma.doc.create({
      data: {
        authorId,
        workspaceId,
        title: data.title,
        content: data.content,
        projectId: data.projectId,
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async update(id: string, data: UpdateDocDto) {
    return prisma.doc.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async softDelete(id: string) {
    return prisma.doc.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const docRepository = new DocRepository();
