import { z } from 'zod';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskStatusEnum,
  TaskPriorityEnum,
} from '@teamos/shared';

export { CreateTaskSchema, UpdateTaskSchema, TaskStatusEnum, TaskPriorityEnum };
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskFilterQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});
export type TaskFilterQuery = z.infer<typeof TaskFilterQuerySchema>;

export const AddSubscriberSchema = z.object({
  userId: z.string().uuid(),
});
