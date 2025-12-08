import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { verifyAPIKey, getAPIKeyInfo } from '../api-keys/apiKeys';
import { auditFromRequest } from '../audit/audit';
import { isRequestFromTrustedUser } from './trustedUsers';
import rateLimit from 'express-rate-limit';
import { hasScopedPermission } from '../permissions/permissions';

/**
 * Middleware to require API key authentication OR JWT token
 * This is for sensitive operations that should be accessible via API keys or authenticated users
 * SECURITY: Accepts both API keys (for external access) and JWT tokens (for frontend authenticated users)
 */
export async function requireAPIKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;
    
    // Try API key first (from X-API-Key header or Authorization header if it starts with sk_)
    const apiKey = apiKeyHeader || (authHeader?.startsWith('Bearer sk_') ? authHeader.replace('Bearer ', '') : null);
    
    if (apiKey && apiKey.startsWith('sk_')) {
      // Verify API key
      const isValid = await verifyAPIKey(apiKey);
      if (!isValid) {
        await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
          status: 'FAILURE',
          errorMessage: 'Invalid or expired API key',
          details: {
            endpoint: req.path,
            method: req.method,
            authType: 'API_KEY',
            // NEVER log the actual key
          },
        }).catch(console.error);
        throw new ForbiddenError('Invalid or expired API key');
      }

      // Get API key info and attach to request
      const keyInfo = await getAPIKeyInfo(apiKey);
      if (!keyInfo) {
        throw new ForbiddenError('API key not found');
      }

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

      // Log successful API key authentication
      await auditFromRequest(req, 'AUTH_SUCCESS', 'AUTH', {
        status: 'SUCCESS',
        details: {
          endpoint: req.path,
          method: req.method,
          authType: 'API_KEY',
          apiKeyId: keyInfo.id,
          apiKeyName: keyInfo.name,
          // NEVER log the actual key
        },
      }).catch(console.error);

      return next();
    }

    // Fall back to JWT token (for authenticated frontend users)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { verifyToken } = await import('../auth/auth');
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        
        // Attach user info to request
        (req as any).user = payload;
        
        // Log successful JWT authentication for sensitive operation
        await auditFromRequest(req, 'AUTH_SUCCESS', 'AUTH', {
          status: 'SUCCESS',
          details: {
            endpoint: req.path,
            method: req.method,
            authType: 'JWT',
            userId: payload.userId,
          },
        }).catch(console.error);
        
        return next();
      } catch (error) {
        // JWT verification failed
        await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
          status: 'FAILURE',
          errorMessage: 'Invalid or expired JWT token',
          details: {
            endpoint: req.path,
            method: req.method,
            authType: 'JWT',
          },
        }).catch(console.error);
        throw new ForbiddenError('Invalid or expired token');
      }
    }

    // No valid authentication provided
    await auditFromRequest(req, 'AUTH_FAILED', 'AUTH', {
      status: 'FAILURE',
      errorMessage: 'API key or JWT token required for this operation',
      details: {
        endpoint: req.path,
        method: req.method,
        authType: 'REQUIRED',
      },
    }).catch(console.error);
    throw new ForbiddenError('API key or JWT token is required for this operation');
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check if user has admin role
 * Requires authentication first
 * Only the first registered user (admin) can access protected endpoints
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;
    
    if (!user && !apiKey) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get userId from user or API key
    const userId = user?.userId || apiKey?.userId;
    
    if (!userId) {
      throw new UnauthorizedError('User ID not found');
    }

    // Check if user is admin
    const { prisma } = await import('../database/prisma');
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!soldier) {
      throw new UnauthorizedError('User not found');
    }

    if (!soldier.isAdmin) {
      // Log unauthorized admin access attempt
      await auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'SYSTEM', {
        status: 'FAILURE',
        errorMessage: 'Admin access required',
        details: {
          endpoint: req.path,
          method: req.method,
          userId,
        },
      }).catch(console.error);
      
      throw new ForbiddenError('Admin access required. Only the first registered user has admin privileges.');
    }

    // Log successful admin access
    await auditFromRequest(req, 'ADMIN_ACCESS', 'SYSTEM', {
      status: 'SUCCESS',
      details: {
        endpoint: req.path,
        method: req.method,
        userId,
      },
    }).catch(console.error);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Rate limiting configuration
 * Limits requests to prevent abuse
 * Trusted users (developers/admins) are exempt from rate limiting
 * 
 * UPDATED: Increased limits significantly to allow continuous work
 * - Normal users: 5000 requests per 15 minutes (~333 requests/minute)
 * - This allows for intensive searching and continuous work without IP bans
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per windowMs (~333 requests/minute)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: async (req: Request) => {
    // Skip rate limiting for trusted users
    return await isRequestFromTrustedUser(req);
  },
  handler: async (req: Request, res: Response) => {
    // Log rate limit violation
    await auditFromRequest(req, 'RATE_LIMIT_EXCEEDED', 'SYSTEM', {
      status: 'FAILURE',
      errorMessage: 'Rate limit exceeded',
      details: {
        endpoint: req.path,
        method: req.method,
      },
    }).catch(console.error);
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Trusted users have higher limits but are still rate limited
 * 
 * UPDATED: Increased limits significantly to allow continuous work
 * - Normal users: 500 requests per 15 minutes (~33 requests/minute)
 * - Trusted users: 2000 requests per 15 minutes (~133 requests/minute)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    // Trusted users get higher limits
    const isTrusted = await isRequestFromTrustedUser(req);
    return isTrusted ? 2000 : 500; // Trusted: 2000, Regular: 500
  },
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await auditFromRequest(req, 'RATE_LIMIT_EXCEEDED', 'SYSTEM', {
      status: 'FAILURE',
      errorMessage: 'Rate limit exceeded for sensitive operation',
      details: {
        endpoint: req.path,
        method: req.method,
      },
    }).catch(console.error);
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * File upload rate limiter
 * Allows larger files and more uploads for trusted users and admins
 * Admin users are completely exempt from rate limiting
 */
export const fileUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    // Check if user is admin
    const user = (req as any).user;
    let isAdmin = false;
    if (user?.userId) {
      try {
        const { prisma } = await import('../database/prisma');
        const soldier = await prisma.soldier.findUnique({
          where: { id: user.userId },
          select: { isAdmin: true },
        });
        isAdmin = soldier?.isAdmin || false;
      } catch (error) {
        // If check fails, continue with normal rate limiting
        console.error('Error checking admin status for rate limiter:', error);
      }
    }
    
    // Admin: unlimited, Trusted: 100 uploads/hour, Regular: 5 uploads/hour
    if (isAdmin) {
      return 1000; // Effectively unlimited for admin
    }
    
    const isTrusted = await isRequestFromTrustedUser(req);
    return isTrusted ? 100 : 5; // Trusted: 100 uploads/hour, Regular: 5 uploads/hour
  },
  skip: async (req: Request) => {
    // Skip rate limiting for admin users completely
    const user = (req as any).user;
    if (user?.userId) {
      try {
        const { prisma } = await import('../database/prisma');
        const soldier = await prisma.soldier.findUnique({
          where: { id: user.userId },
          select: { isAdmin: true },
        });
        if (soldier?.isAdmin) {
          return true; // Skip rate limiting for admins
        }
      } catch (error) {
        // If check fails, don't skip
        console.error('Error checking admin status for rate limiter skip:', error);
      }
    }
    return false; // Don't skip for non-admins
  },
  message: 'Too many file uploads. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await auditFromRequest(req, 'RATE_LIMIT_EXCEEDED', 'SYSTEM', {
      status: 'FAILURE',
      errorMessage: 'File upload rate limit exceeded',
      details: {
        endpoint: req.path,
        method: req.method,
      },
    }).catch(console.error);
    
    res.status(429).json({
      error: 'Too many file uploads. Please try again later.',
    });
  },
});

/**
 * Registration rate limiter
 * SECURITY: Limits registration attempts to prevent abuse
 * Each IP can only register once per hour (additional check in service ensures only one pending user per IP)
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // Only 1 registration attempt per hour per IP
  message: 'You can only register once per hour. If you have a pending registration, please wait for admin approval.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await auditFromRequest(req, 'RATE_LIMIT_EXCEEDED', 'SYSTEM', {
      status: 'FAILURE',
      errorMessage: 'Registration rate limit exceeded',
      details: {
        endpoint: req.path,
        method: req.method,
        email: req.body?.email,
      },
    }).catch(console.error);
    
    res.status(429).json({
      error: 'You can only register once per hour. If you have a pending registration, please wait for admin approval.',
    });
  },
});

/**
 * Login rate limiter - Brute Force Protection
 * SECURITY: Limits login attempts to prevent brute force attacks
 * - Normal users: 5 attempts per 15 minutes
 * - Trusted users: 20 attempts per 15 minutes
 * - Admins: 50 attempts per 15 minutes
 * - Only counts failed attempts (skipSuccessfulRequests: true)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    // Check if user is admin
    const user = (req as any).user;
    let isAdmin = false;
    if (user?.userId) {
      try {
        const { prisma } = await import('../database/prisma');
        const soldier = await prisma.soldier.findUnique({
          where: { id: user.userId },
          select: { isAdmin: true },
        });
        isAdmin = soldier?.isAdmin || false;
      } catch (error) {
        // If check fails, continue with normal rate limiting
        console.error('Error checking admin status for login rate limiter:', error);
      }
    }
    
    const isTrusted = await isRequestFromTrustedUser(req);
    
    // Admin: 50, Trusted: 20, Regular: 5 login attempts per 15 minutes
    if (isAdmin) {
      return 50;
    }
    return isTrusted ? 20 : 5;
  },
  skipSuccessfulRequests: true, // Only count failed login attempts
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await auditFromRequest(req, 'RATE_LIMIT_EXCEEDED', 'AUTH', {
      status: 'FAILURE',
      errorMessage: 'Login rate limit exceeded - possible brute force attack',
      details: {
        endpoint: req.path,
        method: req.method,
        email: req.body?.email, // Log email for security monitoring
      },
    }).catch(console.error);
    
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 15 * 60, // seconds
    });
  },
});

/**
 * Middleware to require a specific permission
 * Usage: requirePermission('students.read')
 */
export function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const apiKey = (req as any).apiKey;
      
      if (!user && !apiKey) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get userId from user or API key
      const userId = user?.userId || apiKey?.userId;
      
      if (!userId) {
        throw new UnauthorizedError('User ID not found');
      }

      // Check permission using new scoped permission system
      const hasPermission = await hasScopedPermission(userId, permissionName);

      if (!hasPermission) {
        // Log unauthorized access attempt
        await auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'PERMISSION', {
          status: 'FAILURE',
          errorMessage: `Permission required: ${permissionName}`,
          details: {
            endpoint: req.path,
            method: req.method,
            userId,
            requiredPermission: permissionName,
          },
        }).catch(console.error);
        
        throw new ForbiddenError(`Permission required: ${permissionName}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to require permission for a resource and action
 * Usage: requireResourcePermission('students', 'read')
 */
export function requireResourcePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const apiKey = (req as any).apiKey;
      
      if (!user && !apiKey) {
        throw new UnauthorizedError('Authentication required');
      }

      // Get userId from user or API key
      const userId = user?.userId || apiKey?.userId;
      
      if (!userId) {
        throw new UnauthorizedError('User ID not found');
      }

      // Check permission using new scoped permission system
      const permissionString = `${resource}:${action}`;
      const hasPermission = await hasScopedPermission(userId, permissionString);

      if (!hasPermission) {
        // Log unauthorized access attempt
        await auditFromRequest(req, 'UNAUTHORIZED_ACCESS', 'PERMISSION', {
          status: 'FAILURE',
          errorMessage: `Permission required: ${resource}.${action}`,
          details: {
            endpoint: req.path,
            method: req.method,
            userId,
            requiredResource: resource,
            requiredAction: action,
          },
        }).catch(console.error);
        
        throw new ForbiddenError(`Permission required: ${resource}.${action}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

