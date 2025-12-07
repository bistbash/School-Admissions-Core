import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';
import { UnauthorizedError, ForbiddenError } from './errors';
import crypto from 'crypto';

/**
 * Generate a new API key
 */
export function generateAPIKey(): string {
  // Generate a secure random API key
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash an API key for storage
 */
export function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key
 */
export async function verifyAPIKey(key: string): Promise<boolean> {
  if (!key || !key.startsWith('sk_')) {
    return false;
  }

  const hashedKey = hashAPIKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
  });

  if (!apiKey || !apiKey.isActive) {
    return false;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return false;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(console.error); // Don't fail if update fails

  return true;
}

/**
 * Get API key info
 */
export async function getAPIKeyInfo(key: string) {
  if (!key || !key.startsWith('sk_')) {
    return null;
  }

  const hashedKey = hashAPIKey(key);
  return prisma.apiKey.findUnique({
    where: { key: hashedKey },
  });
}

/**
 * Create a new API key
 * SECURITY: The plain key is NEVER stored in database or logs
 */
export async function createAPIKey(
  name: string,
  userId?: number,
  expiresAt?: Date,
  permissions?: Record<string, any>
) {
  // Generate secure random key
  const key = generateAPIKey();
  // Hash immediately - never store plain key
  const hashedKey = hashAPIKey(key);

  // Store only the hash
  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashedKey, // Only hash is stored
      name,
      userId,
      expiresAt,
      permissions: permissions ? JSON.stringify(permissions) : null,
      isActive: true,
    },
  });

  // Return the plain key ONLY ONCE (never logged or stored)
  // This is the only time the plain key exists in memory
  return {
    id: apiKey.id,
    key, // Plain key - shown only once, never logged
    name: apiKey.name,
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt,
  };
}

/**
 * Revoke an API key - permanently deletes it from database
 * SECURITY: Complete removal ensures the key cannot be reactivated
 */
export async function revokeAPIKey(keyId: number) {
  return prisma.apiKey.delete({
    where: { id: keyId },
  });
}

/**
 * Get all API keys for a user
 */
export async function getUserAPIKeys(userId: number) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      // Never return the actual key hash
    },
  });
}

/**
 * Middleware to authenticate requests using API keys
 * SECURITY: Never logs the actual API key value
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for API key in header
    const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedError('API key is required');
    }

    // Verify API key
    const isValid = await verifyAPIKey(apiKey);
    if (!isValid) {
      // Log failed attempt (without the key itself)
      const { auditFromRequest } = await import('./audit');
      await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
        status: 'FAILURE',
        errorMessage: 'Invalid or expired API key',
        details: {
          authType: 'API_KEY',
          // NEVER log the actual key
        },
      }).catch(console.error);
      throw new UnauthorizedError('Invalid or expired API key');
    }

    // Get API key info and attach to request
    const keyInfo = await getAPIKeyInfo(apiKey);
    if (keyInfo) {
      (req as any).apiKey = {
        id: keyInfo.id,
        name: keyInfo.name,
        userId: keyInfo.userId,
        permissions: keyInfo.permissions ? JSON.parse(keyInfo.permissions) : null,
      };
      
      // Log successful API key usage (without the key itself)
      const { auditFromRequest } = await import('./audit');
      await auditFromRequest(req, 'READ', 'AUTH', {
        status: 'SUCCESS',
        details: {
          authType: 'API_KEY',
          apiKeyId: keyInfo.id,
          apiKeyName: keyInfo.name,
          // NEVER log the actual key
        },
      }).catch(console.error);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional API key authentication - doesn't fail if no key
 */
export async function optionalAPIKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');

    if (apiKey) {
      const isValid = await verifyAPIKey(apiKey);
      if (isValid) {
        const keyInfo = await getAPIKeyInfo(apiKey);
        if (keyInfo) {
          (req as any).apiKey = {
            id: keyInfo.id,
            name: keyInfo.name,
            userId: keyInfo.userId,
            permissions: keyInfo.permissions ? JSON.parse(keyInfo.permissions) : null,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

