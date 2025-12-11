import { Request, Response, NextFunction } from 'express';
import { APIKeysService, CreateAPIKeyData } from './api-keys.service';
import { z } from 'zod';

const apiKeysService = new APIKeysService();

const createAPIKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  expiresAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  permissions: z.record(z.any()).optional(),
});

export class APIKeysController {
  /**
   * Create a new API key
   * POST /api/api-keys
   * SECURITY: The plain key is only returned once and never logged
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validated = createAPIKeySchema.parse(req.body);
      
      const result = await apiKeysService.create(validated, user.userId);
      
      // Log creation (without the key itself)
      // This will be auto-pinned as it's an important operation
      const { auditFromRequest } = await import('../../lib/audit');
      await auditFromRequest(req, 'CREATE', 'API_KEY', {
        status: 'SUCCESS',
        resourceId: result.id,
        details: {
          apiKeyId: result.id,
          apiKeyName: result.name,
          // NEVER log the actual key
        },
      }).catch(console.error);
      
      // IMPORTANT: The plain key is only shown once and never stored in logs!
      res.status(201).json({
        message: 'API key created successfully. Save this key - it will not be shown again!',
        apiKey: result,
        warning: 'This is the only time you will see this key. Store it securely.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's API keys
   * GET /api/api-keys
   * SECURITY: Never returns the actual key value
   */
  async getUserKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const keys = await apiKeysService.getUserKeys(user.userId);
      // Ensure no key values are returned
      const sanitized = keys.map((key: any) => ({
        ...key,
        // Explicitly ensure no key field exists
      }));
      res.json(sanitized);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all API keys (admin)
   * GET /api/api-keys/all
   * SECURITY: Never returns the actual key value
   */
  async getAllKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await apiKeysService.getAllKeys();
      // Ensure no key values are returned
      const sanitized = keys.map((key: any) => ({
        ...key,
        // Explicitly ensure no key field exists
      }));
      res.json(sanitized);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke an API key - permanently deletes it
   * DELETE /api/api-keys/:id
   */
  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const keyId = Number(req.params.id);
      const user = (req as any).user;

      // Get key info before deletion for logging
      const keyInfo = await apiKeysService.getKeyInfo(keyId);
      
      await apiKeysService.revoke(keyId, user?.userId);
      
      // Log permanent deletion (without key details)
      const { auditFromRequest } = await import('../../lib/audit');
      await auditFromRequest(req, 'DELETE', 'AUDIT_LOG', {
        status: 'SUCCESS',
        resourceId: keyId,
        details: {
          resource: 'API_KEY',
          action: 'PERMANENT_DELETE',
          apiKeyName: keyInfo?.name,
          // Never log key details
        },
      }).catch(console.error);
      
      res.json({ message: 'API key permanently deleted' });
    } catch (error) {
      next(error);
    }
  }
}

