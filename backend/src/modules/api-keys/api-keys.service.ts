import { prisma } from '../../lib/database/prisma';
import { createAPIKey, revokeAPIKey, getUserAPIKeys } from '../../lib/api-keys/apiKeys';
import { NotFoundError } from '../../lib/utils/errors';

export interface CreateAPIKeyData {
  name: string;
  expiresAt?: Date;
  permissions?: Record<string, any>;
}

export class APIKeysService {
  /**
   * Create a new API key
   */
  async create(data: CreateAPIKeyData, userId?: number) {
    return createAPIKey(data.name, userId, data.expiresAt, data.permissions);
  }

  /**
   * Get API key info (for logging before deletion)
   */
  async getKeyInfo(keyId: number) {
    return (prisma as any).apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        name: true,
        userId: true,
        // Never return the key hash
      },
    });
  }

  /**
   * Revoke an API key - permanently deletes it from database
   */
  async revoke(keyId: number, userId?: number) {
    // Check if key exists and belongs to user (if userId provided)
    const key = await (prisma as any).apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundError('API Key');
    }

    if (userId && key.userId !== userId) {
      throw new Error('You do not have permission to revoke this API key');
    }

    // Permanently delete the key
    return revokeAPIKey(keyId);
  }

  /**
   * Get all API keys for a user
   * SECURITY: Never returns the actual key value
   * NOTE: Only returns active keys (deleted keys are permanently removed)
   */
  async getUserKeys(userId: number) {
    return getUserAPIKeys(userId);
  }

  /**
   * Get all API keys (admin only)
   * SECURITY: Never returns the actual key value or hash
   * NOTE: Only returns active keys (deleted keys are permanently removed)
   */
  async getAllKeys() {
    return (prisma as any).apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        userId: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        // SECURITY: Never return the actual key hash or any key-related data
        // The 'key' field is explicitly excluded
        // NOTE: Deleted keys are permanently removed, so only active keys appear
      },
    });
  }
}

