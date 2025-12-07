import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errors';
import { auditFromRequest } from './audit';

/**
 * CSRF Protection Middleware
 * 
 * For API endpoints, we use a combination of:
 * 1. SameSite cookies (set in auth responses)
 * 2. Origin/Referer header validation
 * 3. Custom CSRF token for state-changing operations
 * 
 * Note: Full CSRF protection requires frontend changes to include CSRF tokens.
 * This middleware provides basic protection for API endpoints.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check for API key authentication (external services)
  if ((req as any).apiKey) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Check Origin header (most reliable)
  if (origin && origin !== allowedOrigin) {
    auditFromRequest(req, 'CSRF_ATTEMPT', 'SECURITY', {
      status: 'FAILURE',
      errorMessage: 'Invalid origin header',
      details: {
        origin,
        allowedOrigin,
        method: req.method,
        path: req.path,
      },
    }).catch(console.error);

    throw new ForbiddenError('Invalid origin. CSRF protection triggered.');
  }

  // Fallback: Check Referer header if Origin is not available
  if (!origin && referer) {
    const refererUrl = new URL(referer);
    const allowedUrl = new URL(allowedOrigin);
    
    if (refererUrl.origin !== allowedUrl.origin) {
      auditFromRequest(req, 'CSRF_ATTEMPT', 'SECURITY', {
        status: 'FAILURE',
        errorMessage: 'Invalid referer header',
        details: {
          referer,
          allowedOrigin,
          method: req.method,
          path: req.path,
        },
      }).catch(console.error);

      throw new ForbiddenError('Invalid referer. CSRF protection triggered.');
    }
  }

  // For state-changing operations, require CSRF token if available
  // This is a basic check - full implementation would require frontend changes
  const csrfToken = req.headers['x-csrf-token'];
  const sessionCsrfToken = (req as any).session?.csrfToken;

  // If CSRF token is provided, validate it
  if (csrfToken && sessionCsrfToken && csrfToken !== sessionCsrfToken) {
    auditFromRequest(req, 'CSRF_ATTEMPT', 'SECURITY', {
      status: 'FAILURE',
      errorMessage: 'Invalid CSRF token',
      details: {
        method: req.method,
        path: req.path,
      },
    }).catch(console.error);

    throw new ForbiddenError('Invalid CSRF token.');
  }

  next();
}

/**
 * Helper to set secure cookie options
 * Use this when setting cookies in responses
 */
export function getSecureCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true, // Prevent XSS attacks
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict' as const, // CSRF protection
    // Note: maxAge should be set per cookie (e.g., 7 days for auth tokens)
  };
}
