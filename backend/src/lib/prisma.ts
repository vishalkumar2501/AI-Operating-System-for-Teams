import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Singleton pattern: reuse the same PrismaClient across hot reloads in development
// to avoid exhausting database connections during tsx watch restarts.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
