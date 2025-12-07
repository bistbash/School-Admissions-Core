import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './errors';
import { verifyAPIKey, getAPIKeyInfo } from './apiKeys';
import { auditFromRequest } from './audit';
import { isRequestFromTrustedUser } from './trustedUsers';
import rateLimit from 'express-rate-limit';

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
      const { verifyToken } = await import('./auth');
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
    const { prisma } = await import('./prisma');
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
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    // Trusted users get higher limits
    const isTrusted = await isRequestFromTrustedUser(req);
    return isTrusted ? 100 : 10; // Trusted: 100, Regular: 10
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
 */
export const fileUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    // Check if user is admin
    const user = (req as any).user;
    let isAdmin = false;
    if (user?.userId) {
      const { prisma } = await import('./prisma');
      const soldier = await prisma.soldier.findUnique({
        where: { id: user.userId },
        select: { isAdmin: true },
      });
      isAdmin = soldier?.isAdmin || false;
    }
    
    // Admin: unlimited, Trusted: 100 uploads/hour, Regular: 5 uploads/hour
    if (isAdmin) {
      return 1000; // Effectively unlimited for admin
    }
    
    const isTrusted = await isRequestFromTrustedUser(req);
    return isTrusted ? 100 : 5; // Trusted: 100 uploads/hour, Regular: 5 uploads/hour
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

