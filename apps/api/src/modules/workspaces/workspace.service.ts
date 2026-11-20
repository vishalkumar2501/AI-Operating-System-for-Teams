import { randomBytes } from 'crypto';
import { hashToken } from '../auth/auth.service';
import { workspaceRepository } from './workspace.repository';
import { createHttpError } from '../../middleware/errorHandler';
import { sendEmail } from '../../lib/email';
import { createAuditLog } from '../audit/audit.service';
import { env } from '../../config/env';
import type { CreateWorkspaceDto, InviteDto, UpdateMemberRoleDto } from './workspace.schema';
import { WorkspaceRole } from '@prisma/client';

/** Convert a display name to a URL-safe slug. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric chars
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .slice(0, 60);                  // cap length
}

export async function createWorkspace(userId: string, dto: CreateWorkspaceDto) {
  const slug = dto.slug ?? slugify(dto.name);

  const existing = await workspaceRepository.findWorkspaceBySlug(slug);
  if (existing) {
    throw createHttpError(409, 'DUPLICATE_ENTRY', `A workspace with slug "${slug}" already exists`);
  }

  const workspace = await workspaceRepository.createWorkspace({
    name: dto.name,
    slug,
    ownerId: userId,
  });

  // Creator is always the OWNER of the workspace they create
  await workspaceRepository.addMember(workspace.id, userId, WorkspaceRole.OWNER);

  await createAuditLog({
    workspaceId: workspace.id,
    actorType: 'USER',
    actorId: userId,
    action: 'WORKSPACE_CREATED',
    entityType: 'WORKSPACE',
    entityId: workspace.id,
    after: { name: workspace.name, slug: workspace.slug },
  });

  return workspace;
}

export async function inviteMember(
  workspaceId: string,
  inviterId: string,
  dto: InviteDto,
) {
  const inviterMember = await workspaceRepository.getMember(workspaceId, inviterId);
  if (
    !inviterMember ||
    (inviterMember.role !== WorkspaceRole.OWNER && inviterMember.role !== WorkspaceRole.ADMIN)
  ) {
    throw createHttpError(403, 'FORBIDDEN', 'Only workspace owners and admins can invite members');
  }

  // Prevent inviting someone who is already a member
  const existingInvite = await workspaceRepository.findInviteByEmail(workspaceId, dto.email);
  if (existingInvite) {
    throw createHttpError(409, 'DUPLICATE_INVITE', 'An active invite for this email already exists');
  }

  // We generate a raw token for the email link, but store only the hash in the DB
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await workspaceRepository.createInvite({
    workspaceId,
    email: dto.email,
    role: dto.role,
    tokenHash,
    expiresAt,
  });

  const acceptUrl = `${env.CLIENT_URL}/invites/${rawToken}/accept`;

  await sendEmail({
    to: dto.email,
    subject: 'You have been invited to a TeamOS workspace',
    text: `You have been invited to join a workspace. Accept your invite here: ${acceptUrl}\n\nThis link expires in 7 days.`,
    html: `<p>You have been invited to join a workspace on TeamOS.</p>
           <p><a href="${acceptUrl}">Accept Invite</a></p>
           <p>This link expires in 7 days.</p>`,
  });

  await createAuditLog({
    workspaceId,
    actorType: 'USER',
    actorId: inviterId,
    action: 'MEMBER_INVITED',
    entityType: 'INVITE',
    entityId: invite.id,
    after: { email: dto.email, role: dto.role },
  });

  return { ...invite, inviteUrl: acceptUrl };
}

export async function acceptInvite(rawToken: string, userId: string) {
  const tokenHash = hashToken(rawToken);
  const invite = await workspaceRepository.findInviteByToken(tokenHash);

  if (!invite) {
    throw createHttpError(404, 'NOT_FOUND', 'Invite not found or already used');
  }
  if (invite.acceptedAt) {
    throw createHttpError(410, 'INVITE_USED', 'This invite has already been accepted');
  }
  if (invite.expiresAt < new Date()) {
    throw createHttpError(410, 'INVITE_EXPIRED', 'This invite has expired');
  }

  await workspaceRepository.addMember(invite.workspaceId, userId, invite.role);
  await workspaceRepository.acceptInvite(invite.id);

  await createAuditLog({
    workspaceId: invite.workspaceId,
    actorType: 'USER',
    actorId: userId,
    action: 'MEMBER_JOINED',
    entityType: 'WORKSPACE',
    entityId: invite.workspaceId,
    after: { role: invite.role },
  });

  return workspaceRepository.findWorkspaceById(invite.workspaceId);
}

export function getMembers(workspaceId: string) {
  return workspaceRepository.getMembers(workspaceId);
}

export function getWorkspaces(userId: string) {
  return workspaceRepository.getUserWorkspaces(userId);
}

export async function updateMemberRole(
  workspaceId: string,
  actorId: string,
  targetUserId: string,
  dto: UpdateMemberRoleDto,
) {
  const actor = await workspaceRepository.getMember(workspaceId, actorId);
  if (
    !actor ||
    (actor.role !== WorkspaceRole.OWNER && actor.role !== WorkspaceRole.ADMIN)
  ) {
    throw createHttpError(403, 'FORBIDDEN', 'Only owners and admins can change member roles');
  }

  const target = await workspaceRepository.getMember(workspaceId, targetUserId);
  if (!target) {
    throw createHttpError(404, 'NOT_FOUND', 'Member not found in this workspace');
  }

  // The OWNER role is locked — it transfers ownership via a separate flow
  if (target.role === WorkspaceRole.OWNER) {
    throw createHttpError(403, 'FORBIDDEN', 'Cannot change the workspace owner role');
  }

  // Actors cannot demote their own role
  if (actorId === targetUserId) {
    throw createHttpError(403, 'FORBIDDEN', 'You cannot change your own role');
  }

  const updated = await workspaceRepository.updateMemberRole(workspaceId, targetUserId, dto.role);

  await createAuditLog({
    workspaceId,
    actorType: 'USER',
    actorId,
    action: 'MEMBER_ROLE_UPDATED',
    entityType: 'WORKSPACE_MEMBER',
    entityId: target.id,
    before: { role: target.role },
    after: { role: dto.role },
  });

  return updated;
}
