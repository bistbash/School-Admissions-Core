import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errors';
import { auditFromRequest } from './audit';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

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
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
      const { verifyAPIKey, getAPIKeyInfo } = await import('./apiKeys');
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

