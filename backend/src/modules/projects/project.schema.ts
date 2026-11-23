import { z } from 'zod';
import { CreateProjectSchema, UpdateProjectSchema } from '@teamos/shared';

export { CreateProjectSchema, UpdateProjectSchema };
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
