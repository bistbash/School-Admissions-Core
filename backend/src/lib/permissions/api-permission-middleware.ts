/**
 * API Permission Middleware
 * 
 * This middleware enforces permission-based access control for all API endpoints.
 * 
 * SECURITY FEATURES:
 * - Admin users (including those using API keys) automatically get access to ALL endpoints
 * - Non-admin users are checked against their page permissions and direct resource:action permissions
 * - CREATED and PENDING users can access GET /api/roles, GET /api/departments, and POST /api/auth/complete-profile for profile completion
 * - All APPROVED users can access GET /api/roles and GET /api/departments as public reference data (needed for dropdowns)
 * - All APPROVED users can access self-access endpoints (GET /api/permissions/my-permissions, GET /api/auth/me, etc.)
 * - All access attempts are logged to SOC for security monitoring
 * 
 * HOW IT WORKS:
 * 1. If user is admin (checked via userId from JWT or API key) -> Full access granted immediately
 * 2. If user is CREATED or PENDING AND requesting profile completion endpoints (GET /api/roles, GET /api/departments, POST /api/auth/complete-profile) -> Allow access
 * 3. If user is APPROVED AND requesting public reference endpoints (GET /api/roles, GET /api/departments) -> Allow access
 * 4. If user is APPROVED AND requesting self-access endpoints (GET /api/permissions/my-permissions, GET /api/auth/me, etc.) -> Allow access
 * 5. Otherwise, checks if user has page permission (view/edit) that includes the requested API
 * 6. Also checks direct resource:action permissions as fallback
 * 7. All checks are cached for performance (5 minute TTL)
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
import { permissionPolicies, PermissionContext } from './permission-policies';

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
 * User status cache for performance
 */
const userStatusCache = new Map<number, 'CREATED' | 'PENDING' | 'APPROVED' | 'REJECTED' | null>();
const USER_STATUS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserApprovalStatus(userId: number): Promise<'CREATED' | 'PENDING' | 'APPROVED' | 'REJECTED' | null> {
  // Check cache first
  if (userStatusCache.has(userId)) {
    return userStatusCache.get(userId)!;
  }

  // Check database
  const { prisma } = await import('../database/prisma');
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
    select: { approvalStatus: true },
  });

  const status = (user?.approvalStatus as any) || null;
  
  // Cache the result
  userStatusCache.set(userId, status);
  
  // Clear cache after TTL
  setTimeout(() => {
    userStatusCache.delete(userId);
  }, USER_STATUS_CACHE_TTL);

  return status;
}

/**
 * Check if user needs profile completion (cached check for performance)
 * CREATED users (newly created by admin) need access to roles and departments for profile completion
 * PENDING users (after completing profile, waiting for approval) also need this access
 */
async function needsProfileCompletion(userId: number): Promise<boolean> {
  const status = await getUserApprovalStatus(userId);
  return status === 'CREATED' || status === 'PENDING';
}

/**
 * Normalize path for consistent matching
 * Handles both /api/roles and /roles formats
 */
function normalizePath(path: string): string {
  let normalized = path.split('?')[0].replace(/\/$/, '');
  if (!normalized.startsWith('/api')) {
    normalized = '/api' + normalized;
  }
  return normalized;
}

/**
 * Check policies in priority order
 * Returns true if any policy allows access
 */
async function checkPolicies(context: PermissionContext): Promise<boolean> {
  for (const policy of permissionPolicies) {
    try {
      const allowed = await policy.check(context);
      if (allowed) {
        if (process.env.DEBUG_PERMISSIONS === 'true') {
          console.log(`[PERM] Policy "${policy.name}" granted access for user ${context.userId} on ${context.method} ${context.path}`);
        }
        return true;
      }
    } catch (error) {
      // Log policy error but continue to next policy
      console.error(`Error in policy ${policy.name}:`, error);
    }
  }
  return false;
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
        if (hasPermission) {
          if (process.env.DEBUG_PERMISSIONS === 'true') {
            console.log(`[PERM] Granted access: user ${userId} has ${permissionName} for ${method} ${normalizedPath}`);
          }
          return true;
        }
      }
    }
    
    // Check edit APIs
    for (const apiPerm of pagePermission.editAPIs) {
      if (matchesAPIPermission(apiPerm, method, normalizedPath)) {
        const permissionName = `page:${pageKey}:edit`;
        const hasPermission = await hasScopedPermission(userId, permissionName);
        if (hasPermission) {
          if (process.env.DEBUG_PERMISSIONS === 'true') {
            console.log(`[PERM] Granted access: user ${userId} has ${permissionName} for ${method} ${normalizedPath}`);
          }
          return true;
        }
      }
    }
  }

  // Also check direct resource:action permissions
  const resource = extractResourceFromPath(normalizedPath);
  const action = extractActionFromMethod(method);
  
  if (resource && action) {
    const permissionName = `${resource}:${action}`;
    const hasDirectPermission = await hasScopedPermission(userId, permissionName);
    if (hasDirectPermission) {
      if (process.env.DEBUG_PERMISSIONS === 'true') {
        console.log(`[PERM] Granted access: user ${userId} has direct permission ${permissionName} for ${method} ${normalizedPath}`);
      }
      return true;
    }
  }

  if (process.env.DEBUG_PERMISSIONS === 'true') {
    console.log(`[PERM] No permission found for user ${userId} on ${method} ${normalizedPath}`);
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
    // Only log if auditMiddleware hasn't already logged this request
    // This prevents duplicate logs for the same unauthenticated request
    if (!(req as any).__auditLogged) {
      auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
        status: 'FAILURE',
        errorMessage: 'Authentication required',
        details: {
          endpoint: req.path || req.url?.split('?')[0] || '',
          method: req.method,
          reason: 'No authentication provided',
        },
      }).catch(console.error);
    }
    return next(new UnauthorizedError('Authentication required'));
  }

  // Use req.originalUrl or req.url to get full path (includes /api prefix)
  const requestPath = req.originalUrl?.split('?')[0] || req.url.split('?')[0] || req.path;
  
  // Build permission context
  Promise.all([
    isUserAdmin(userId),
    getUserApprovalStatus(userId),
  ])
    .then(([isAdmin, approvalStatus]) => {
      const context: PermissionContext = {
        userId,
        method: req.method,
        path: requestPath,
        approvalStatus,
        isAdmin,
        authType: apiKey ? 'API_KEY' : 'JWT',
      };

      // Try policies first (they handle special cases like admin, profile completion, etc.)
      return checkPolicies(context)
        .then((policyAllowed) => {
          if (policyAllowed) {
            return next();
          }

          // No policy matched - check standard page/resource permissions
          return hasAPIPermission(userId, req.method, requestPath)
            .then(async (hasPermission) => {
              if (!hasPermission) {
                // Try to find which permission is needed for better error messages
                let requiredPermission = null;
                for (const [pageKey, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
                  for (const apiPerm of [...pagePermission.viewAPIs, ...pagePermission.editAPIs]) {
                    if (matchesAPIPermission(apiPerm, req.method, requestPath)) {
                      requiredPermission = `page:${pageKey}:${pagePermission.viewAPIs.includes(apiPerm) ? 'view' : 'edit'}`;
                      break;
                    }
                  }
                  if (requiredPermission) break;
                }
                
                const errorMsg = requiredPermission 
                  ? `You need the permission "${requiredPermission}" to access ${req.method} ${req.path}`
                  : `You do not have permission to access ${req.method} ${req.path}`;
                
                // Audit log for security monitoring (always logged)
                auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'AUTH', {
                  status: 'FAILURE',
                  errorMessage: errorMsg,
                  details: {
                    userId,
                    method: req.method,
                    path: req.path,
                    requestPath,
                    approvalStatus,
                    authType: context.authType,
                    requiredPermission,
                  },
                }).catch(console.error);
                
                return next(new ForbiddenError(errorMsg));
              }
              
              if (process.env.DEBUG_PERMISSIONS === 'true') {
                console.log(`[PERM] Granted access: user ${userId} has permission for ${req.method} ${requestPath}`);
              }
              next();
            });
        });
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
