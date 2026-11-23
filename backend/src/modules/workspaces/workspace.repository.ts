import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const workspaceRepository = {
  createWorkspace(data: { name: string; slug: string; ownerId: string }) {
    return prisma.workspace.create({ data });
  },

  findWorkspaceById(id: string) {
    return prisma.workspace.findUnique({ where: { id } });
  },

  findWorkspaceBySlug(slug: string) {
    return prisma.workspace.findUnique({ where: { slug } });
  },

  /** All workspaces the user has a membership in. */
  getUserWorkspaces(userId: string) {
    return prisma.workspace.findMany({
      where: {
        members: { some: { userId } },
        deletedAt: null,
      },
      include: {
        members: { where: { userId }, select: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
  },

  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  },

  removeMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  /** All members of a workspace, with their user profile. */
  getMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  getMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  createInvite(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.invite.create({ data });
  },

  findInviteByToken(tokenHash: string) {
    return prisma.invite.findUnique({ where: { tokenHash } });
  },

  findInviteByEmail(workspaceId: string, email: string) {
    return prisma.invite.findFirst({
      where: { workspaceId, email, acceptedAt: null },
    });
  },

  acceptInvite(inviteId: string) {
    return prisma.invite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
    });
  },
};
