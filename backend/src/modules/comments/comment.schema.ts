import { z } from 'zod';
import { CreateCommentSchema } from '@teamos/shared';

export { CreateCommentSchema };
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
