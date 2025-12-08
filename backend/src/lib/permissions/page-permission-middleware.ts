/**
 * Page Permission Middleware for API Routes
 * 
 * Checks if user has page permission that grants access to the API endpoint
 * The system now works exclusively with page permissions - when a user has
 * page permission (view/edit), they automatically get the corresponding API permissions
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage } from './permission-registry';
import { PermissionsService } from '../../modules/permissions/permissions.service';

const permissionsService = new PermissionsService();

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
 * Find which page(s) grant permission for this API endpoint
 */
function findPagesForAPI(resource: string, action: string): Array<{ page: string; requiredAction: 'view' | 'edit' }> {
  const pages: Array<{ page: string; requiredAction: 'view' | 'edit' }> = [];

  for (const [pageName, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
    // Check view APIs
    const hasViewAPI = pagePermission.viewAPIs.some(
      api => api.resource === resource && api.action === action
    );
    if (hasViewAPI) {
      pages.push({ page: pageName, requiredAction: 'view' });
    }

    // Check edit APIs
    const hasEditAPI = pagePermission.editAPIs.some(
      api => api.resource === resource && api.action === action
    );
    if (hasEditAPI) {
      pages.push({ page: pageName, requiredAction: 'edit' });
    }
  }

  return pages;
}

/**
 * Check if user has page permission that grants access to this API
 */
async function checkPagePermissionForAPI(
  userId: number,
  resource: string,
  action: string
): Promise<boolean> {
  // Get user to check if admin
  const { prisma } = await import('../database/prisma');
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  // Admins have all permissions
  if ((user as any)?.isAdmin) {
    return true;
  }

  // Find which pages grant this API permission
  const pages = findPagesForAPI(resource, action);
  
  if (pages.length === 0) {
    // If no page grants this API, deny access (secure by default)
    return false;
  }

  // Get user's page permissions
  const userPagePermissions = await permissionsService.getUserPagePermissions(userId);

  // Check if user has at least one required page permission
  for (const { page, requiredAction } of pages) {
    const pagePerm = userPagePermissions[page];
    if (pagePerm) {
      // If required action is 'view', user needs view or edit
      // If required action is 'edit', user needs edit
      if (requiredAction === 'view' && (pagePerm.view || pagePerm.edit)) {
        return true;
      }
      if (requiredAction === 'edit' && pagePerm.edit) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Permission middleware - checks if user has page permission for the API endpoint
 * 
 * Usage:
 * router.get('/students', requirePagePermission, controller.getAll);
 * 
 * This will automatically check if user has page permission that grants 'students:read'
 */
export async function requirePagePermission(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Extract resource and action from request
    const pathInfo = extractResourceFromPath(req.path, req.method);
    if (!pathInfo) {
      // If we can't determine the resource, deny access (secure by default)
      throw new UnauthorizedError('Cannot determine required permission for this endpoint');
    }

    const { resource, action } = pathInfo;

    // Check if user has page permission that grants this API access
    const hasPermission = await checkPagePermissionForAPI(user.userId, resource, action);
    if (!hasPermission) {
      throw new UnauthorizedError(
        `Insufficient permissions: ${resource}:${action} (requires page permission)`
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
 * router.get('/students', requireResourcePagePermission('students', 'read'), controller.getAll);
 */
export function requireResourcePagePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user || !user.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasPermission = await checkPagePermissionForAPI(user.userId, resource, action);
      if (!hasPermission) {
        throw new UnauthorizedError(
          `Insufficient permissions: ${resource}:${action} (requires page permission)`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
