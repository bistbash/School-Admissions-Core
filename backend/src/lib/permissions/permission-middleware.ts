/**
 * Permission Middleware for API Routes
 * 
 * Automatically checks permissions based on the request path and method
 */

import { Request, Response, NextFunction } from 'express';
import { hasScopedPermission } from './permissions';
import { UnauthorizedError } from '../utils/errors';
import { PAGE_PERMISSIONS } from './permission-registry';

/**
 * Map HTTP methods to actions
 */
const METHOD_TO_ACTION: Record<string, string> = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Extract resource and action from request path
 */
function extractResourceFromPath(path: string, method: string): { resource: string; action: string } | null {
  // Remove /api prefix
  const cleanPath = path.replace(/^\/api\//, '');
  
  // Split path segments
  const segments = cleanPath.split('/').filter(s => s);
  
  if (segments.length === 0) {
    return null;
  }

  const resource = segments[0];
  const action = METHOD_TO_ACTION[method] || 'read';

  return { resource, action };
}

/**
 * Check if user has permission for the requested resource and action
 */
async function checkAPIPermission(
  userId: number,
  resource: string,
  action: string
): Promise<boolean> {
  // Admins have all permissions (checked in hasScopedPermission)
  const permissionString = `${resource}:${action}`;
  return hasScopedPermission(userId, permissionString);
}

/**
 * Permission middleware - checks if user has permission for the API endpoint
 * 
 * Usage:
 * router.get('/students', requirePermission, controller.getAll);
 * 
 * This will automatically check for 'students:read' permission
 */
export async function requirePermission(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Extract resource and action from request
    const pathInfo = extractResourceFromPath(req.path, req.method);
    if (!pathInfo) {
      // If we can't determine the resource, allow (might be a special endpoint)
      return next();
    }

    const { resource, action } = pathInfo;

    // Check permission
    const hasPermission = await checkAPIPermission(user.userId, resource, action);
    if (!hasPermission) {
      throw new UnauthorizedError(
        `Insufficient permissions: ${resource}:${action}`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Create a permission middleware for a specific resource and action
 * 
 * Usage:
 * router.get('/students', requireResourcePermission('students', 'read'), controller.getAll);
 */
export function requireResourcePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user || !user.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasPermission = await checkAPIPermission(user.userId, resource, action);
      if (!hasPermission) {
        throw new UnauthorizedError(
          `Insufficient permissions: ${resource}:${action}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional permission check - doesn't fail if no permission, but adds info to request
 */
export async function optionalPermission(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.userId) {
      return next();
    }

    const pathInfo = extractResourceFromPath(req.path, req.method);
    if (!pathInfo) {
      return next();
    }

    const { resource, action } = pathInfo;
    const hasPermission = await checkAPIPermission(user.userId, resource, action);
    
    // Attach permission info to request
    (req as any).hasPermission = hasPermission;
    (req as any).requiredPermission = `${resource}:${action}`;

    next();
  } catch (error) {
    // Don't fail on optional permission check
    next();
  }
}
