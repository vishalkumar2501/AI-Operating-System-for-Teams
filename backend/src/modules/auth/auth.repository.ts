import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

// Redis TTL for refresh tokens — mirrors the JWT expiry so both expire together
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Build the Redis key for a user's refresh token hash. */
function refreshKey(userId: string, tokenHash: string): string {
  return `refresh:${userId}:${tokenHash}`;
}

/** Build a pattern to match all refresh tokens for a user (for mass-revocation). */
function refreshKeyPattern(userId: string): string {
  return `refresh:${userId}:*`;
}

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },

  createUser(data: {
    email: string;
    name: string;
    passwordHash?: string;
    googleId?: string;
    avatarUrl?: string;
  }) {
    return prisma.user.create({ data });
  },

  updateUserGoogleId(userId: string, googleId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  },

  /**
   * Persist a refresh token hash in Redis with a 7-day TTL.
   * We store the hash (not the raw token) so a leaked Redis dump
   * can't be used to forge tokens.
   */
  async storeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await redis.set(refreshKey(userId, tokenHash), '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);
  },

  /**
   * Check if a refresh token hash exists in Redis.
   * Returns true only for tokens that were issued and not yet revoked.
   */
  async findRefreshToken(userId: string, tokenHash: string): Promise<boolean> {
    const value = await redis.get(refreshKey(userId, tokenHash));
    return value === '1';
  },

  /** Revoke a single refresh token (called on logout or token rotation). */
  async revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await redis.del(refreshKey(userId, tokenHash));
  },

  /**
   * Revoke all refresh tokens for a user — useful when a password is changed
   * or a suspicious login is detected.
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = refreshKeyPattern(userId);
    // SCAN is non-blocking unlike KEYS; safe to use in production
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  },
};
