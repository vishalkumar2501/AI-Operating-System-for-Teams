import { z } from 'zod';

// ============================================================================
// Roles & Permissions
// ============================================================================
export const WorkspaceRoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleEnum>;

// ============================================================================
// Task Status & Priority
// ============================================================================
export const TaskStatusEnum = z.enum([
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

// ============================================================================
// AI Agent Action Status
// ============================================================================
export const AgentActionStatusEnum = z.enum([
  'PROPOSED',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'FAILED',
]);
export type AgentActionStatus = z.infer<typeof AgentActionStatusEnum>;

// ============================================================================
// Standard API Response Format (Section 8 Blueprint)
// ============================================================================
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    nextCursor?: string | null;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
