import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment variable validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  ALLOW_DEBUG: z.string().transform(val => val === 'true').optional(),
  DATABASE_URL: z.string().url().optional(), // Optional if using SQLite
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validate and return environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    logger.info('Environment variables validated successfully');
    return validatedEnv;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.error({ errors: error.errors }, `Environment validation failed: ${missingVars}`);
      throw new Error(`Invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
