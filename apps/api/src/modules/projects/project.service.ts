import { projectRepository } from './project.repository';
import { createAuditLog } from '../audit/audit.service';
import { createHttpError } from '../../middleware/errorHandler';
import type { CreateProjectInput, UpdateProjectInput } from './project.schema';

export const projectService = {
  async getProjectsByWorkspace(workspaceId: string) {
    return projectRepository.findByWorkspaceId(workspaceId);
  },

  async getProjectById(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw createHttpError(404, 'NOT_FOUND', 'Project not found');
    }
    return project;
  },

  async createProject(workspaceId: string, userId: string, data: CreateProjectInput) {
    // Check key uniqueness within this workspace
    const existing = await projectRepository.findByKey(workspaceId, data.key);
    if (existing) {
      throw createHttpError(409, 'DUPLICATE_ENTRY', `A project with key "${data.key}" already exists in this workspace`);
    }

    const project = await projectRepository.create(workspaceId, data);

    await createAuditLog({
      workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      after: project as unknown as Record<string, unknown>,
    });

    return project;
  },

  async updateProject(projectId: string, userId: string, data: UpdateProjectInput) {
    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      throw createHttpError(404, 'NOT_FOUND', 'Project not found');
    }

    if (data.key && data.key !== existing.key) {
      const keyConflict = await projectRepository.findByKey(existing.workspaceId, data.key);
      if (keyConflict) {
        throw createHttpError(409, 'DUPLICATE_ENTRY', `A project with key "${data.key}" already exists`);
      }
    }

    const updated = await projectRepository.update(projectId, data);

    await createAuditLog({
      workspaceId: existing.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: projectId,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  },

  async deleteProject(projectId: string, userId: string) {
    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      throw createHttpError(404, 'NOT_FOUND', 'Project not found');
    }

    const deleted = await projectRepository.softDelete(projectId);

    await createAuditLog({
      workspaceId: existing.workspaceId,
      actorType: 'USER',
      actorId: userId,
      action: 'PROJECT_DELETED',
      entityType: 'PROJECT',
      entityId: projectId,
      before: existing as unknown as Record<string, unknown>,
    });

    return deleted;
  },
};
