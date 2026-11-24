import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { google } from 'googleapis';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { createHttpError } from '../../middleware/errorHandler';
import { authRepository } from './auth.repository';
import { createAuditLog } from '../audit/audit.service';
import type { RegisterDto, LoginDto } from './auth.schema';

const BCRYPT_COST = 10; // Optimized for cloud serverless/shared vCPU response times (OWASP compliant)

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

/** Hash a plain-text password. Cost 12 is a good balance of security vs latency. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Sign a short-lived access token (15 m). */
export function generateAccessToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Sign a long-lived refresh token (7 d). */
export function generateRefreshToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * SHA-256 hex digest of a token.
 * We store this instead of the raw token so a Redis breach can't
 * be used to impersonate users directly.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

export async function register(dto: RegisterDto): Promise<AuthResult> {
  const existing = await authRepository.findUserByEmail(dto.email);
  if (existing) {
    throw createHttpError(409, 'DUPLICATE_ENTRY', 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(dto.password);
  const user = await authRepository.createUser({
    email: dto.email,
    name: dto.name,
    passwordHash,
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email);

  await createAuditLog({
    workspaceId: 'global',
    actorType: 'USER',
    actorId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'USER',
    entityId: user.id,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    accessToken,
    refreshToken,
  };
}

export async function login(dto: LoginDto): Promise<AuthResult> {
  const user = await authRepository.findUserByEmail(dto.email);

  // Intentionally vague error — don't reveal whether the email exists
  if (!user || !user.passwordHash) {
    throw createHttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const passwordValid = await comparePassword(dto.password, user.passwordHash);
  if (!passwordValid) {
    throw createHttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email);

  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(
  rawRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { id: string; email: string };

  try {
    payload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch {
    throw createHttpError(401, 'INVALID_TOKEN', 'Refresh token is invalid or expired');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const exists = await authRepository.findRefreshToken(payload.id, tokenHash);
  if (!exists) {
    // Token was already rotated or revoked — possible replay attack
    throw createHttpError(401, 'TOKEN_REUSE', 'Refresh token has already been used');
  }

  // Rotate: revoke the old token and issue a fresh pair
  await authRepository.revokeRefreshToken(payload.id, tokenHash);
  return issueTokenPair(payload.id, payload.email);
}

export async function logout(userId: string, rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await authRepository.revokeRefreshToken(userId, tokenHash);
}

/** Generate and persist a new access + refresh token pair. */
async function issueTokenPair(
  userId: string,
  email: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken({ id: userId, email });
  const refreshToken = generateRefreshToken({ id: userId, email });
  const tokenHash = hashToken(refreshToken);
  await authRepository.storeRefreshToken(userId, tokenHash);
  return { accessToken, refreshToken };
}

export function getGoogleAuthUrl(): string {
  if (!env.GOOGLE_CLIENT_ID) {
    throw createHttpError(
      503,
      'OAUTH_NOT_CONFIGURED',
      'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env'
    );
  }
  const oAuth2Client = buildOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
  });
}

export async function handleGoogleCallback(code: string): Promise<AuthResult> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw createHttpError(
      503,
      'OAUTH_NOT_CONFIGURED',
      'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env'
    );
  }

  const oAuth2Client = buildOAuthClient();

  let tokens: any;
  try {
    const tokenResponse = await oAuth2Client.getToken(code);
    tokens = tokenResponse.tokens;
  } catch (err) {
    logger.warn({ err }, 'Google token exchange failed');
    throw createHttpError(
      400,
      'GOOGLE_AUTH_FAILED',
      'Failed to exchange Google authorization code'
    );
  }

  oAuth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.email || !profile.id) {
    throw createHttpError(400, 'GOOGLE_AUTH_FAILED', 'Google profile is missing required fields');
  }

  // Try to find by Google ID first, then by email (linking existing accounts)
  let user =
    (await authRepository.findUserByGoogleId(profile.id)) ??
    (await authRepository.findUserByEmail(profile.email));

  if (user) {
    // Link Google ID if the account was created with email/password
    if (!user.googleId) {
      await authRepository.updateUserGoogleId(user.id, profile.id);
    }
  } else {
    user = await authRepository.createUser({
      email: profile.email,
      name: profile.name ?? profile.email,
      googleId: profile.id,
      avatarUrl: profile.picture ?? undefined,
    });
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email);

  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    accessToken,
    refreshToken,
  };
}
