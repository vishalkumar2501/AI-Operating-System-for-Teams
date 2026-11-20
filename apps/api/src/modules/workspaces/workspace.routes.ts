import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireWorkspaceMember } from '../../middleware/requireWorkspaceMember';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { WorkspaceRole } from '@prisma/client';
import {
  CreateWorkspaceSchema,
  InviteSchema,
  UpdateMemberRoleSchema,
} from './workspace.schema';
import * as workspaceController from './workspace.controller';

export const workspaceRouter = Router();

// Create a workspace (any authenticated user can start one)
workspaceRouter.post(
  '/workspaces',
  authenticate,
  validate(CreateWorkspaceSchema),
  workspaceController.createWorkspace,
);

// List workspaces the requesting user is a member of
workspaceRouter.get('/workspaces', authenticate, workspaceController.getWorkspaces);

// Invite a member — only ADMINs and OWNERs can send invites
workspaceRouter.post(
  '/workspaces/:workspaceId/invites',
  authenticate,
  requireWorkspaceMember,
  requireRole(WorkspaceRole.ADMIN, WorkspaceRole.OWNER),
  validate(InviteSchema),
  workspaceController.inviteMember,
);

// Accept an invite via the token from the email link
workspaceRouter.post(
  '/invites/:token/accept',
  authenticate,
  workspaceController.acceptInvite,
);

// List members — any workspace member can see the roster
workspaceRouter.get(
  '/workspaces/:workspaceId/members',
  authenticate,
  requireWorkspaceMember,
  workspaceController.getMembers,
);

// Change a member's role — only ADMINs and OWNERs
workspaceRouter.patch(
  '/workspaces/:workspaceId/members/:userId',
  authenticate,
  requireWorkspaceMember,
  requireRole(WorkspaceRole.ADMIN, WorkspaceRole.OWNER),
  validate(UpdateMemberRoleSchema),
  workspaceController.updateMemberRole,
);
