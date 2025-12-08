import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { auditFromRequest } from '../audit/audit';

// Load environment variables before checking JWT_SECRET
// This ensures .env is loaded even if this module is imported before server.ts
dotenv.config();

// SECURITY: Enforce strong JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

// SECURITY: JWT_SECRET is REQUIRED - no fallback allowed
// This prevents accidental use of default secret in production
if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is REQUIRED. ' +
    'The application cannot start without a secure JWT secret. ' +
    'Generate a strong secret: openssl rand -base64 32'
  );
}

const SECRET = JWT_SECRET;

export interface JwtPayload {
  userId: number;
  personalNumber: string;
  email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Authentication middleware - protects routes
 * Supports both JWT tokens and API keys
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Try API key first
    if (apiKey) {
      const { verifyAPIKey, getAPIKeyInfo } = await import('../api-keys/apiKeys');
      const isValid = await verifyAPIKey(apiKey);
      
      if (isValid) {
        const keyInfo = await getAPIKeyInfo(apiKey);
        if (keyInfo) {
          // Attach API key info to request
          (req as any).apiKey = {
            id: keyInfo.id,
            name: keyInfo.name,
            userId: keyInfo.userId,
            permissions: keyInfo.permissions ? JSON.parse(keyInfo.permissions) : null,
          };
          
          // If API key has userId, attach user info
          if (keyInfo.userId) {
            (req as any).user = {
              userId: keyInfo.userId,
            };
          }
          
          return next();
        }
      }
    }

    // Fall back to JWT token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Log unauthorized access attempt
      await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
        status: 'FAILURE',
        errorMessage: 'No token or API key provided',
      });
      throw new UnauthorizedError('No token or API key provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    // Attach user info to request
    (req as any).user = payload;
    
    next();
  } catch (error) {
    // Log authentication failure
    if (error instanceof UnauthorizedError) {
      await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
        status: 'FAILURE',
        errorMessage: error.message,
      }).catch(console.error);
    }
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      (req as any).user = payload;
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

