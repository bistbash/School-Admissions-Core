import { Request, Response, NextFunction } from 'express';

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

export class DocsController {
  /**
   * Get API documentation
   * GET /api/docs
   */
  async getDocs(req: Request, res: Response, next: NextFunction) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
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
                grade: 'ט\' | י\' | י"א | י"ב | י"ג | י"ד (required)',
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
                currentGrade: 'string (required) - ט\', י\', י"א, י"ב, י"ג, או י"ד',
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

      const documentation = {
        title: 'School Admissions Core API Documentation',
        version: '1.0.0',
        baseUrl,
        description: 'Complete API documentation for all available endpoints',
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
        endpoints,
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
