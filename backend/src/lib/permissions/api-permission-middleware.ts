/**
 * API Permission Middleware
 * 
 * This middleware enforces permission-based access control for all API endpoints.
 * 
 * SECURITY FEATURES:
 * - Admin users (including those using API keys) automatically get access to ALL endpoints
 * - Non-admin users are checked against their page permissions and direct resource:action permissions
 * - All access attempts are logged to SOC for security monitoring
 * 
 * HOW IT WORKS:
 * 1. If user is admin (checked via userId from JWT or API key) -> Full access granted immediately
 * 2. Otherwise, checks if user has page permission (view/edit) that includes the requested API
 * 3. Also checks direct resource:action permissions as fallback
 * 4. All checks are cached for performance (5 minute TTL)
 * 
 * API KEY SUPPORT:
 * - API keys that belong to admin users automatically get full access
 * - The userId from the API key is checked against the admin status
 * - This works seamlessly with JWT tokens - same permission logic for both
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { hasScopedPermission } from './permissions';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage, APIPermission } from './permission-registry';
import { auditFromRequest } from '../audit/audit';

/**
 * Check if user is admin (cached check for performance)
 */
const adminCache = new Map<number, boolean>();
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function isUserAdmin(userId: number): Promise<boolean> {
  // Check cache first
  if (adminCache.has(userId)) {
    return adminCache.get(userId)!;
  }

  // Check database
  const { prisma } = await import('../database/prisma');
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  const isAdmin = user?.isAdmin ?? false;
  
  // Cache the result
  adminCache.set(userId, isAdmin);
  
  // Clear cache after TTL
  setTimeout(() => {
    adminCache.delete(userId);
  }, ADMIN_CACHE_TTL);

  return isAdmin;
}

/**
 * Check if user has permission for a specific API endpoint
 */
async function hasAPIPermission(
  userId: number | undefined,
  method: string,
  path: string
): Promise<boolean> {
  // If no userId, deny access
  if (!userId) {
    return false;
  }

  // Admins have all permissions - check this FIRST for performance
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return true;
  }

  // Normalize path (remove query params and trailing slashes)
  // Path might be relative (/auth/login) or absolute (/api/auth/login)
  let normalizedPath = path.split('?')[0].replace(/\/$/, '');
  
  // If path doesn't start with /api, add it for matching
  if (!normalizedPath.startsWith('/api')) {
    normalizedPath = '/api' + normalizedPath;
  }
  
  // Check all page permissions to find matching API
  for (const [pageKey, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
    // Check view APIs
    for (const apiPerm of pagePermission.viewAPIs) {
      if (matchesAPIPermission(apiPerm, method, normalizedPath)) {
        const permissionName = `page:${pageKey}:view`;
        const hasPermission = await hasScopedPermission(userId, permissionName);
        if (hasPermission) return true;
      }
    }
    
    // Check edit APIs
    for (const apiPerm of pagePermission.editAPIs) {
      if (matchesAPIPermission(apiPerm, method, normalizedPath)) {
        const permissionName = `page:${pageKey}:edit`;
        const hasPermission = await hasScopedPermission(userId, permissionName);
        if (hasPermission) return true;
      }
    }
  }

  // Also check direct resource:action permissions
  const resource = extractResourceFromPath(normalizedPath);
  const action = extractActionFromMethod(method);
  
  if (resource && action) {
    const permissionName = `${resource}:${action}`;
    return hasScopedPermission(userId, permissionName);
  }

  return false;
}

/**
 * Check if an API permission matches the request
 */
function matchesAPIPermission(apiPerm: APIPermission, method: string, path: string): boolean {
  // Method must match
  if (apiPerm.method !== method) {
    return false;
  }

  // Convert API permission path pattern to regex
  // e.g., /api/students/:id -> /api/students/[^/]+
  // This matches any characters except slashes (supports numeric, alphanumeric, UUIDs, etc.)
  // Note: We don't escape forward slashes - they're already literal in the path string
  const pattern = apiPerm.path.replace(/:[^/]+/g, '[^/]+'); // Replace :id, :idNumber, etc. with [^/]+

  const regex = new RegExp(`^${pattern}$`);
  return regex.test(path);
}

/**
 * Extract resource name from path
 */
function extractResourceFromPath(path: string): string | null {
  // Path might be /api/resource or just /resource
  const normalizedPath = path.startsWith('/api') ? path : '/api' + path;
  
  if (normalizedPath.includes('/students')) return 'students';
  if (normalizedPath.includes('/soldiers')) return 'soldiers';
  if (normalizedPath.includes('/departments')) return 'departments';
  if (normalizedPath.includes('/roles')) return 'roles';
  if (normalizedPath.includes('/rooms')) return 'rooms';
  if (normalizedPath.includes('/cohorts')) return 'cohorts';
  if (normalizedPath.includes('/tracks')) return 'tracks';
  if (normalizedPath.includes('/classes')) return 'classes';
  if (normalizedPath.includes('/student-exits')) return 'student-exits';
  if (normalizedPath.includes('/permissions')) return 'permissions';
  if (normalizedPath.includes('/api-keys')) return 'api-keys';
  if (normalizedPath.includes('/soc')) return 'soc';
  if (normalizedPath.includes('/auth')) return 'auth';
  return null;
}

/**
 * Extract action from HTTP method
 */
function extractActionFromMethod(method: string): string | null {
  if (method === 'GET') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return null;
}

/**
 * Middleware to check API permissions
 * This should be used after authentication middleware
 * SECURITY: Admin users (including those using API keys) automatically get access to everything
 */
export function requireAPIPermission(req: Request, res: Response, next: NextFunction) {
  // Allow public endpoints (health checks, etc.)
  if (req.path === '/health' || req.path === '/ready' || req.path === '/live' || req.path.startsWith('/static')) {
    return next();
  }

  // Allow public auth endpoints
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    return next();
  }

  // Get user ID from request (works for both JWT tokens and API keys)
  const user = (req as any).user;
  const apiKey = (req as any).apiKey;
  const userId = user?.userId || apiKey?.userId;

  if (!userId) {
    auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
      status: 'FAILURE',
      errorMessage: 'Authentication required',
    }).catch(console.error);
    return next(new UnauthorizedError('Authentication required'));
  }

  // Check permission asynchronously
  // Note: If userId belongs to an admin (whether from JWT or API key), hasAPIPermission will return true immediately
  hasAPIPermission(userId, req.method, req.path)
    .then((hasPermission) => {
      if (!hasPermission) {
        auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
          status: 'FAILURE',
          errorMessage: `Access denied to ${req.method} ${req.path}`,
          details: {
            userId,
            method: req.method,
            path: req.path,
            authType: apiKey ? 'API_KEY' : 'JWT',
          },
        }).catch(console.error);
        return next(new ForbiddenError(`You do not have permission to access ${req.method} ${req.path}`));
      }
      next();
    })
    .catch((error) => {
      console.error('Error checking API permission:', error);
      // On error, deny access for security
      auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
        status: 'ERROR',
        errorMessage: `Error checking permission: ${error.message}`,
      }).catch(console.error);
      next(new ForbiddenError('Permission check failed'));
    });
}

/**
 * Optional permission check - doesn't fail if no permission, but logs it
 */
export function optionalAPIPermission(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const apiKey = (req as any).apiKey;
  const userId = user?.userId || apiKey?.userId;

  if (!userId) {
    return next();
  }

  hasAPIPermission(userId, req.method, req.path)
    .then((hasPermission) => {
      if (!hasPermission) {
        // Log but don't block
        auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
          status: 'FAILURE',
          errorMessage: `No permission for ${req.method} ${req.path} (optional check)`,
        }).catch(console.error);
      }
      next();
    })
    .catch(() => {
      // Ignore errors in optional check
      next();
    });
}
