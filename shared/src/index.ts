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
  type: z.enum(['BLOCKS']).optional().default('BLOCKS'),
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
// Comments (Phase 4)
// ============================================================================
export const CreateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body cannot be empty').max(10000),
  mentions: z.array(z.string()).optional().default([]),
  parentCommentId: z.string().uuid().optional().nullable(),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export interface CommentAuthor {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface CommentItem {
  id: string;
  taskId: string;
  authorId: string;
  author: CommentAuthor;
  body: string;
  mentions: string[];
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Realtime Presence & Socket Events (Phase 4)
// ============================================================================
export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  lastActive: number;
}

export const SocketEvents = {
  // Rooms
  JOIN_WORKSPACE: 'room:join_workspace',
  LEAVE_WORKSPACE: 'room:leave_workspace',
  JOIN_PROJECT: 'room:join_project',
  LEAVE_PROJECT: 'room:leave_project',
  JOIN_TASK: 'room:join_task',
  LEAVE_TASK: 'room:leave_task',

  // Presence
  PRESENCE_HEARTBEAT: 'presence:heartbeat',
  PRESENCE_UPDATE: 'presence:update',
  TASK_VIEWERS_UPDATE: 'task:viewers_update',

  // Typing
  TASK_TYPING: 'task:typing',
  USER_TYPING: 'task:user_typing',

  // Realtime events
  TASK_UPDATED: 'task:updated',
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',
} as const;

export type SocketEventType = (typeof SocketEvents)[keyof typeof SocketEvents];

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
// Phase 5: Meetings & Calendar
// ============================================================================
export const MeetingStatusEnum = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export type MeetingStatus = z.infer<typeof MeetingStatusEnum>;

export const ParticipantRsvpEnum = z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE']);
export type ParticipantRsvp = z.infer<typeof ParticipantRsvpEnum>;

export const TranscriptStatusEnum = z.enum(['PROCESSING', 'COMPLETED', 'FAILED']);
export type TranscriptStatus = z.infer<typeof TranscriptStatusEnum>;

export const CreateMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  startsAt: z.string().datetime('Valid startsAt ISO date required'),
  endsAt: z.string().datetime('Valid endsAt ISO date required'),
  projectId: z.string().uuid().optional().nullable(),
  meetingUrl: z.string().url().optional().nullable(),
  participantIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateMeetingDto = z.infer<typeof CreateMeetingSchema>;

export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: MeetingStatusEnum.optional(),
  projectId: z.string().uuid().optional().nullable(),
  meetingUrl: z.string().url().optional().nullable(),
  recordingUrl: z.string().url().optional().nullable(),
});
export type UpdateMeetingDto = z.infer<typeof UpdateMeetingSchema>;

export const UpdateRsvpSchema = z.object({
  rsvp: ParticipantRsvpEnum,
});
export type UpdateRsvpDto = z.infer<typeof UpdateRsvpSchema>;

export interface MeetingParticipantItem {
  id: string;
  userId: string;
  rsvp: ParticipantRsvp;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface TranscriptSegmentItem {
  id: string;
  speakerName?: string | null;
  speakerId?: string | null;
  startMs: number;
  endMs: number;
  text: string;
}

export interface ActionItemExtracted {
  title: string;
  assigneeName?: string | null;
  assigneeId?: string | null;
  deadline?: string | null;
  suggestedPriority?: TaskPriority;
}

export interface TranscriptItem {
  id: string;
  meetingId: string;
  rawText: string;
  summary?: string | null;
  actionItems?: ActionItemExtracted[] | null;
  status: TranscriptStatus;
  segments?: TranscriptSegmentItem[];
  createdAt: string;
}

export interface MeetingItem {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  project?: { id: string; name: string; key: string } | null;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  organizerId: string;
  organizer: { id: string; name: string; email: string; avatarUrl?: string | null };
  status: MeetingStatus;
  meetingUrl?: string | null;
  recordingUrl?: string | null;
  participants: MeetingParticipantItem[];
  transcript?: TranscriptItem | null;
  createdAt: string;
}

export const CreateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  taskId: z.string().uuid().optional().nullable(),
  meetingId: z.string().uuid().optional().nullable(),
  source: z.enum(['INTERNAL', 'GOOGLE']).optional().default('INTERNAL'),
});
export type CreateCalendarEventDto = z.infer<typeof CreateCalendarEventSchema>;

export interface CalendarFeedItem {
  id: string;
  type: 'MEETING' | 'TASK_DUE' | 'CALENDAR_EVENT';
  title: string;
  startsAt: string;
  endsAt: string;
  source: 'INTERNAL' | 'GOOGLE';
  referenceId: string; // meetingId or taskId or calendarEventId
  details?: {
    status?: string;
    priority?: string;
    assigneeName?: string | null;
    meetingUrl?: string | null;
  };
}

// ============================================================================
// Phase 6: Docs, GitHub Activity & Hybrid Search
// ============================================================================
export const CreateDocSchema = z.object({
  title: z.string().min(1, 'Doc title is required').max(200),
  content: z.string().default(''),
  projectId: z.string().uuid().optional().nullable(),
});
export type CreateDocDto = z.infer<typeof CreateDocSchema>;

export const UpdateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
});
export type UpdateDocDto = z.infer<typeof UpdateDocSchema>;

export interface DocItem {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  project?: { id: string; name: string; key: string } | null;
  title: string;
  content: string;
  authorId: string;
  author: { id: string; name: string; email: string; avatarUrl?: string | null };
  createdAt: string;
  updatedAt: string;
}

export const GitActivityTypeEnum = z.enum(['PR', 'COMMIT', 'ISSUE']);
export type GitActivityType = z.infer<typeof GitActivityTypeEnum>;

export interface GitActivityItem {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  repo: string;
  type: GitActivityType;
  externalId: string;
  title: string;
  author: string;
  url: string;
  linkedTaskId?: string | null;
  linkedTask?: { id: string; keyWithNumber: string; title: string } | null;
  state: string;
  createdAt: string;
}

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
  entityTypes: z.array(z.enum(['TASK', 'DOC', 'COMMENT', 'TRANSCRIPT'])).optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});
export type SearchQueryDto = z.infer<typeof SearchQuerySchema>;

export interface SearchResultItem {
  id: string;
  entityType: 'TASK' | 'DOC' | 'COMMENT' | 'TRANSCRIPT';
  title: string;
  snippet: string;
  score: number;
  url: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Phase 7: AI Agent & Risk Engine
// ============================================================================
export interface ProposedAction {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: AgentActionStatus;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentRunItem {
  id: string;
  workspaceId: string;
  userId: string;
  prompt: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  tokensUsed: number;
  latencyMs: number;
  actions: ProposedAction[];
  createdAt: string;
}

export const AiChatSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  context: z
    .object({
      projectId: z.string().uuid().optional(),
      taskId: z.string().uuid().optional(),
      meetingId: z.string().uuid().optional(),
    })
    .optional(),
});
export type AiChatDto = z.infer<typeof AiChatSchema>;

export const ActionApprovalSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
});
export type ActionApprovalDto = z.infer<typeof ActionApprovalSchema>;

export type RiskType =
  'OVERDUE_CHAIN' | 'BLOCKED_CRITICAL_PATH' | 'OVERLOADED_ASSIGNEE' | 'STALE_TASK';

export interface ProjectRisk {
  id: string;
  type: RiskType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  affectedTaskIds: string[];
  suggestedAction?: {
    tool: string;
    description: string;
    payload: Record<string, unknown>;
  };
}

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
