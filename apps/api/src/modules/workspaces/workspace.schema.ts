import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  // slug is optional — the service auto-derives it from name when omitted
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .min(2)
    .max(60)
    .optional(),
});

export const InviteSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});

export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;
export type InviteDto = z.infer<typeof InviteSchema>;
export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;
