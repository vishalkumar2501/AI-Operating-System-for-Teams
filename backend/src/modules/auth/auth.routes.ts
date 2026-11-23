import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { RegisterSchema, LoginSchema } from './auth.schema';
import * as authController from './auth.controller';

export const authRouter = Router();

// Tighter rate limit on auth endpoints to slow brute-force attacks.
// This applies on top of the global 100-req/15min limit in app.ts.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts, please try again in 15 minutes',
    },
  },
});

authRouter.post('/register', authRateLimit, validate(RegisterSchema), authController.register);
authRouter.post('/login', authRateLimit, validate(LoginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/google', authController.googleRedirect);
authRouter.get('/google/callback', authController.googleCallback);
authRouter.get('/me', authenticate, authController.getMe);
