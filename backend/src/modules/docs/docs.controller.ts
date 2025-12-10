import { Request, Response, NextFunction } from 'express';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage, APIPermission } from '../../lib/permissions/permission-registry';
import { hasScopedPermission } from '../../lib/permissions/permissions';

interface EndpointInfo {
  method: string;
  path: string;
  description: string;
  authentication: 'public' | 'required' | 'admin' | 'api-key';
  rateLimit?: string;
  requestBody?: {
    type: string;
    fields?: Record<string, any>;
  };
  queryParams?: Record<string, string>;
  response?: {
    type: string;
    example?: any;
  };
}

/**
 * Check if user is admin (cached for performance)
 */
const adminCacheDocs = new Map<number, boolean>();
const ADMIN_CACHE_TTL_DOCS = 5 * 60 * 1000; // 5 minutes

async function isUserAdminDocs(userId: number): Promise<boolean> {
  // Check cache first
  if (adminCacheDocs.has(userId)) {
    return adminCacheDocs.get(userId)!;
  }

  // Check database
  const { prisma } = await import('../../lib/database/prisma');
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  const isAdmin = user?.isAdmin ?? false;
  
  // Cache the result
  adminCacheDocs.set(userId, isAdmin);
  
  // Clear cache after TTL
  setTimeout(() => {
    adminCacheDocs.delete(userId);
  }, ADMIN_CACHE_TTL_DOCS);

  return isAdmin;
}

/**
 * Check if user has access to an API endpoint
 * SECURITY: Admin users (including those using API keys) automatically get access to everything
 */
async function hasAccessToEndpoint(
  userId: number | undefined,
  method: string,
  path: string
): Promise<boolean> {
  // Public endpoints are always accessible
  if (path === '/api/auth/login' || path === '/api/auth/register') {
    return true;
  }

  // If no user, only public endpoints are accessible
  if (!userId) {
    return false;
  }

  // Admins have access to everything - check this FIRST for performance
  // This works for both JWT tokens and API keys (as long as they have userId)
  const isAdmin = await isUserAdminDocs(userId);
  if (isAdmin) {
    return true;
  }

  // Normalize path
  const normalizedPath = path.split('?')[0].replace(/\/$/, '');

  // Check all page permissions
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

  // Check direct resource:action permissions
  const resource = extractResourceFromPath(normalizedPath);
  const action = extractActionFromMethod(method);
  
  if (resource && action) {
    const permissionName = `${resource}:${action}`;
    return await hasScopedPermission(userId, permissionName);
  }

  return false;
}

/**
 * Check if an API permission matches the request
 */
function matchesAPIPermission(apiPerm: APIPermission, method: string, path: string): boolean {
  if (apiPerm.method !== method) {
    return false;
  }

  // Replace path parameters (e.g., :id, :idNumber) with [^/]+ pattern for regex matching
  // This matches any characters except slashes (supports numeric, alphanumeric, UUIDs, etc.)
  // Note: We don't escape forward slashes - they're already literal in the path string
  const pattern = apiPerm.path.replace(/:[^/]+/g, '[^/]+');

  const regex = new RegExp(`^${pattern}$`);
  return regex.test(path);
}

/**
 * Extract resource name from path
 */
function extractResourceFromPath(path: string): string | null {
  if (path.includes('/students')) return 'students';
  if (path.includes('/soldiers')) return 'soldiers';
  if (path.includes('/departments')) return 'departments';
  if (path.includes('/roles')) return 'roles';
  if (path.includes('/rooms')) return 'rooms';
  if (path.includes('/cohorts')) return 'cohorts';
  if (path.includes('/tracks')) return 'tracks';
  if (path.includes('/classes')) return 'classes';
  if (path.includes('/student-exits')) return 'student-exits';
  if (path.includes('/permissions')) return 'permissions';
  if (path.includes('/api-keys')) return 'api-keys';
  if (path.includes('/soc')) return 'soc';
  if (path.includes('/auth')) return 'auth';
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

export class DocsController {
  /**
   * Get API documentation (filtered by user permissions)
   * GET /api/docs
   */
  async getDocs(req: Request, res: Response, next: NextFunction) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // Get user ID from request
      const user = (req as any).user;
      const apiKey = (req as any).apiKey;
      const userId = user?.userId || apiKey?.userId;
      
      const endpoints: Record<string, EndpointInfo[]> = {
        authentication: [
          {
            method: 'POST',
            path: '/api/auth/register',
            description: 'Register a new user/soldier',
            authentication: 'public',
            requestBody: {
              type: 'object',
              fields: {
                personalNumber: 'string (required)',
                name: 'string (required)',
                email: 'string (required, valid email)',
                password: 'string (required, min 8 characters)',
                type: 'CONSCRIPT | PERMANENT (required)',
                departmentId: 'number (required)',
                roleId: 'number (optional)',
                isCommander: 'boolean (optional, default: false)',
              },
            },
            response: {
              type: 'object',
              example: {
                token: 'jwt-token',
                user: { id: 1, email: 'user@example.com', name: 'John Doe', isAdmin: false },
              },
            },
          },
          {
            method: 'POST',
            path: '/api/auth/login',
            description: 'Login user and get JWT token',
            authentication: 'public',
            requestBody: {
              type: 'object',
              fields: {
                email: 'string (required)',
                password: 'string (required)',
              },
            },
            response: {
              type: 'object',
              example: {
                token: 'jwt-token',
                user: { id: 1, email: 'user@example.com', isAdmin: false, name: 'John Doe' },
              },
            },
          },
          {
            method: 'GET',
            path: '/api/auth/me',
            description: 'Get current authenticated user info',
            authentication: 'required',
            response: {
              type: 'object',
              example: {
                id: 1,
                personalNumber: '123456789',
                name: 'John Doe',
                email: 'user@example.com',
                isAdmin: false,
                type: 'PERMANENT',
                departmentId: 1,
              },
            },
          },
        ],
        students: [
          {
            method: 'GET',
            path: '/api/students',
            description: 'Get all students with optional filters',
            authentication: 'required',
            queryParams: {
              academicYear: 'number (optional) - Filter by academic year',
              grade: 'string (optional) - Filter by grade',
              status: 'ACTIVE | GRADUATED | LEFT | ARCHIVED (optional)',
            },
            response: {
              type: 'array',
            },
          },
          {
            method: 'GET',
            path: '/api/students/:id',
            description: 'Get student by ID',
            authentication: 'required',
            queryParams: {
              includeHistory: 'boolean (optional) - Include enrollment history',
            },
          },
          {
            method: 'GET',
            path: '/api/students/id-number/:idNumber',
            description: 'Get student by ID number',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/students',
            description: 'Create a new student',
            authentication: 'required',
            requestBody: {
              type: 'object',
              fields: {
                idNumber: 'string (required)',
                firstName: 'string (required)',
                lastName: 'string (required)',
                gender: 'MALE | FEMALE (required)',
                grade: 'ט\' | י\' | י"א | י"ב (required)',
                parallel: '1-8 (optional)',
                track: 'string (optional)',
                cohortId: 'number (required)',
                academicYear: 'number (optional)',
              },
            },
          },
          {
            method: 'PUT',
            path: '/api/students/:id',
            description: 'Update student',
            authentication: 'required',
            requestBody: {
              type: 'object',
              fields: {
                firstName: 'string (optional)',
                lastName: 'string (optional)',
                gender: 'MALE | FEMALE (optional)',
                grade: 'string (optional)',
                parallel: 'string (optional)',
                track: 'string (optional)',
                status: 'ACTIVE | GRADUATED | LEFT | ARCHIVED (optional)',
                academicYear: 'number (optional)',
              },
            },
          },
          {
            method: 'DELETE',
            path: '/api/students/:id',
            description: 'Delete student',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/students/clear-all',
            description: 'Delete all students (Admin only)',
            authentication: 'admin',
            rateLimit: 'strict',
          },
          {
            method: 'POST',
            path: '/api/students/upload',
            description: 'Upload Excel file with students data',
            authentication: 'required',
            rateLimit: 'file-upload',
            requestBody: {
              type: 'multipart/form-data',
              fields: {
                file: 'Excel file (.xlsx, .xls, .csv) - Max 10MB (regular) / 50MB (trusted)',
              },
            },
          },
          {
            method: 'POST',
            path: '/api/students/promote-all',
            description: 'Promote all cohorts to next academic year (Admin only)',
            authentication: 'admin',
            requestBody: {
              type: 'object',
              fields: {
                academicYear: 'number (optional) - Target academic year',
              },
            },
          },
          {
            method: 'POST',
            path: '/api/students/cohorts/:cohortId/promote',
            description: 'Promote specific cohort to next grade (Admin only)',
            authentication: 'admin',
            requestBody: {
              type: 'object',
              fields: {
                academicYear: 'number (optional) - Target academic year',
              },
            },
          },
        ],
        cohorts: [
          {
            method: 'GET',
            path: '/api/cohorts',
            description: 'Get all cohorts',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/cohorts/:id',
            description: 'Get cohort by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/cohorts',
            description: 'Create a new cohort',
            authentication: 'required',
            requestBody: {
              type: 'object',
              fields: {
                name: 'string (required)',
                startYear: `number (required, min: 1954, max: ${new Date().getFullYear() + 1}) - שנת מחזור`,
                currentGrade: 'string (required) - ט\', י\', י"א, או י"ב',
              },
            },
          },
          {
            method: 'PUT',
            path: '/api/cohorts/:id',
            description: 'Update cohort',
            authentication: 'required',
          },
        ],
        'student-exits': [
          {
            method: 'GET',
            path: '/api/student-exits',
            description: 'Get all student exits',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/student-exits/:id',
            description: 'Get student exit by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/student-exits',
            description: 'Create a new student exit record',
            authentication: 'required',
            requestBody: {
              type: 'object',
              fields: {
                studentId: 'number (required)',
                exitDate: 'string (ISO date, required)',
                reason: 'string (required)',
                notes: 'string (optional)',
              },
            },
          },
          {
            method: 'PUT',
            path: '/api/student-exits/:id',
            description: 'Update student exit',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/student-exits/:id',
            description: 'Delete student exit',
            authentication: 'required',
          },
        ],
        'api-keys': [
          {
            method: 'GET',
            path: '/api/api-keys',
            description: 'Get all API keys for current user',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/api-keys',
            description: 'Create a new API key',
            authentication: 'required',
            requestBody: {
              type: 'object',
              fields: {
                name: 'string (required)',
                expiresAt: 'string (ISO date, optional)',
                permissions: 'object (optional)',
              },
            },
            response: {
              type: 'object',
              example: {
                key: 'sk_abcdef123456...',
                id: 1,
                name: 'My API Key',
                createdAt: '2025-12-07T10:00:00Z',
                expiresAt: null,
              },
            },
          },
          {
            method: 'DELETE',
            path: '/api/api-keys/:id',
            description: 'Revoke (delete) an API key',
            authentication: 'required',
          },
        ],
        soc: [
          {
            method: 'GET',
            path: '/api/soc/audit-logs',
            description: 'Get audit logs with filters',
            authentication: 'required',
            queryParams: {
              userId: 'number (optional)',
              userEmail: 'string (optional)',
              action: 'string (optional)',
              resource: 'string (optional)',
              status: 'SUCCESS | FAILURE | ERROR (optional)',
              startDate: 'ISO date (optional)',
              endDate: 'ISO date (optional)',
              limit: 'number (optional, default: 100)',
              offset: 'number (optional, default: 0)',
            },
          },
          {
            method: 'GET',
            path: '/api/soc/stats',
            description: 'Get security statistics',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/soc/alerts',
            description: 'Get security alerts',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/soc/incidents',
            description: 'Get open security incidents',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/soc/blocked-ips',
            description: 'Get list of blocked IP addresses (Admin only)',
            authentication: 'admin',
          },
          {
            method: 'POST',
            path: '/api/soc/block-ip',
            description: 'Block an IP address (Admin only)',
            authentication: 'admin',
            requestBody: {
              type: 'object',
              fields: {
                ipAddress: 'string (required)',
                reason: 'string (optional)',
              },
            },
          },
          {
            method: 'POST',
            path: '/api/soc/unblock-ip',
            description: 'Unblock an IP address (Admin only)',
            authentication: 'admin',
            requestBody: {
              type: 'object',
              fields: {
                ipAddress: 'string (required)',
              },
            },
          },
          {
            method: 'GET',
            path: '/api/soc/trusted-users',
            description: 'Get list of trusted users (Admin only)',
            authentication: 'admin',
          },
          {
            method: 'POST',
            path: '/api/soc/trusted-users',
            description: 'Add a trusted user to whitelist (Admin only)',
            authentication: 'admin',
            requestBody: {
              type: 'object',
              fields: {
                userId: 'number (optional)',
                ipAddress: 'string (optional)',
                email: 'string (optional)',
                name: 'string (optional)',
                reason: 'string (optional)',
                expiresAt: 'ISO date (optional)',
              },
            },
          },
          {
            method: 'DELETE',
            path: '/api/soc/trusted-users/:id',
            description: 'Remove trusted user from whitelist (Admin only)',
            authentication: 'admin',
          },
        ],
        soldiers: [
          {
            method: 'GET',
            path: '/api/soldiers',
            description: 'Get all soldiers',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/soldiers/:id',
            description: 'Get soldier by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/soldiers',
            description: 'Create soldier (Note: Use /auth/register for new users)',
            authentication: 'required',
          },
          {
            method: 'PUT',
            path: '/api/soldiers/:id',
            description: 'Update soldier',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/soldiers/:id',
            description: 'Delete soldier',
            authentication: 'required',
          },
        ],
        departments: [
          {
            method: 'GET',
            path: '/api/departments',
            description: 'Get all departments',
            authentication: 'public',
          },
          {
            method: 'GET',
            path: '/api/departments/:id',
            description: 'Get department by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/departments',
            description: 'Create department',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/departments/:id',
            description: 'Delete department',
            authentication: 'required',
          },
        ],
        roles: [
          {
            method: 'GET',
            path: '/api/roles',
            description: 'Get all roles',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/roles/:id',
            description: 'Get role by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/roles',
            description: 'Create role',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/roles/:id',
            description: 'Delete role',
            authentication: 'required',
          },
        ],
        rooms: [
          {
            method: 'GET',
            path: '/api/rooms',
            description: 'Get all rooms',
            authentication: 'required',
          },
          {
            method: 'GET',
            path: '/api/rooms/:id',
            description: 'Get room by ID',
            authentication: 'required',
          },
          {
            method: 'POST',
            path: '/api/rooms',
            description: 'Create room',
            authentication: 'required',
          },
          {
            method: 'DELETE',
            path: '/api/rooms/:id',
            description: 'Delete room',
            authentication: 'required',
          },
        ],
      };

      // Filter endpoints based on user permissions
      const filteredEndpoints: Record<string, EndpointInfo[]> = {};
      
      for (const [category, categoryEndpoints] of Object.entries(endpoints)) {
        const accessibleEndpoints: EndpointInfo[] = [];
        
        for (const endpoint of categoryEndpoints) {
          // Public endpoints are always accessible
          if (endpoint.authentication === 'public') {
            accessibleEndpoints.push(endpoint);
            continue;
          }
          
          // If no user, skip non-public endpoints
          if (!userId) {
            continue;
          }
          
          // Check if user has access to this endpoint
          const hasAccess = await hasAccessToEndpoint(userId, endpoint.method, endpoint.path);
          if (hasAccess) {
            accessibleEndpoints.push(endpoint);
          }
        }
        
        // Only include category if it has accessible endpoints
        if (accessibleEndpoints.length > 0) {
          filteredEndpoints[category] = accessibleEndpoints;
        }
      }

      const documentation = {
        title: 'School Admissions Core API Documentation',
        version: '1.0.0',
        baseUrl,
        description: userId 
          ? 'API documentation filtered by your permissions. You only see endpoints you have access to.'
          : 'Complete API documentation for all available endpoints. Authenticate to see endpoints you have access to.',
        authenticated: !!userId,
        userId: userId || null,
        authentication: {
          jwt: {
            description: 'Include JWT token in Authorization header',
            example: 'Authorization: Bearer <your-token>',
          },
          apiKey: {
            description: 'Include API key in X-API-Key header or Authorization header',
            example: 'X-API-Key: sk_...',
          },
        },
        rateLimiting: {
          regular: {
            api: '100 requests per minute',
            strict: '10 requests per hour',
            fileUpload: '5 uploads per hour (10MB max)',
          },
          trusted: {
            api: '100 requests per minute',
            strict: '100 requests per hour',
            fileUpload: '50 uploads per hour (50MB max)',
          },
        },
        endpoints: filteredEndpoints,
        security: {
          csrf: 'CSRF protection enabled for state-changing operations',
          https: 'HTTPS enforced in production',
          helmet: 'Security headers enabled via Helmet.js',
          rateLimiting: 'Rate limiting enabled on all API routes',
          ipBlocking: 'IP blocking system with whitelist support',
        },
      };

      res.json(documentation);
    } catch (error) {
      next(error);
    }
  }
}
