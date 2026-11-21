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
// Projects
// ============================================================================
export const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric (e.g. WEB, IOS, API)')
    .toUpperCase(),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;

// ============================================================================
// Tasks
// ============================================================================
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(10000).optional().nullable(),
  status: TaskStatusEnum.optional().default('TODO'),
  priority: TaskPriorityEnum.optional().default('MEDIUM'),
  assigneeId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimate: z.number().min(0).max(1000).optional().nullable(),
  position: z.number().optional().default(0),
});
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  estimate: z.number().min(0).max(1000).optional().nullable(),
  position: z.number().optional(),
});
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;

// ============================================================================
// Task Dependencies
// ============================================================================
export const AddDependencySchema = z.object({
  dependsOnTaskId: z.string().uuid('Prerequisite task ID must be a valid UUID'),
  type: z.enum(['BLOCKS']).default('BLOCKS'),
});
export type AddDependencyDto = z.infer<typeof AddDependencySchema>;

export interface GraphNode {
  id: string;
  key: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimate: number | null;
  isBlocked: boolean;
  isCriticalPath: boolean;
  assignee?: {
    name: string;
    avatarUrl?: string | null;
  } | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  isCriticalPath: boolean;
}

export interface ProjectGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  criticalPath: {
    taskIds: string[];
    totalDuration: number;
  };
}

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
