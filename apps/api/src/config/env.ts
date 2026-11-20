import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Also fallback to current directory .env if running standalone
dotenv.config();

const envSchema = z.object({
  // Core Server Config
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:5000'),

  // Database & Cache
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT Authentication
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth 2.0 (Optional at boot, enforced when Google Auth is triggered)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/auth/google/callback'),

  // Email Service
  EMAIL_PROVIDER: z.enum(['console', 'ethereal', 'resend', 'smtp']).default('console'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('TeamOS <no-reply@teamos.local>'),

  // File Storage
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // Speech & AI
  SPEECH_PROVIDER: z.enum(['browser', 'openai']).default('browser'),
  WHISPER_API_KEY: z.string().optional().default(''),
  LLM_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  LLM_API_KEY: z.string().optional().default(''),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  // GitHub Integration
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default(''),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid or missing environment configuration:');
    parsed.error.errors.forEach((err) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  return parsed.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
