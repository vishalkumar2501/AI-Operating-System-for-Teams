import { z } from 'zod';
import { AddDependencySchema } from '@teamos/shared';

export { AddDependencySchema };
export type AddDependencyInput = z.infer<typeof AddDependencySchema>;
