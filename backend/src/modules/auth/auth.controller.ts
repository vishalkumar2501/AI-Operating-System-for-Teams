import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { createHttpError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Set the httpOnly refresh-token cookie so JS can't read it. */
function setRefreshCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawToken) {
      throw createHttpError(401, 'MISSING_TOKEN', 'Refresh token cookie is missing');
    }

    const tokens = await authService.refreshTokens(rawToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawToken && req.user) {
      await authService.logout(req.user.id, rawToken);
    }
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

export function googleRedirect(req: Request, res: Response, next: NextFunction): void {
  try {
    const url = authService.getGoogleAuthUrl();
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const code = req.query['code'] as string | undefined;
    if (!code) {
      throw createHttpError(400, 'MISSING_CODE', 'Google authorization code is missing');
    }

    const result = await authService.handleGoogleCallback(code);
    setRefreshCookie(res, result.refreshToken);
    // Redirect to the frontend with the access token in the query string
    res.redirect(`${env.CLIENT_URL}/auth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
}

export function getMe(req: Request, res: Response): void {
  res.status(200).json({ success: true, data: { user: req.user } });
}
