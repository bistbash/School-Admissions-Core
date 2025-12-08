import { Request, Response, NextFunction } from 'express';
import { prisma, getPrismaClient } from '../database/prisma';
import { JwtPayload } from '../auth/auth';
import { retryPrismaOperation } from '../database/prisma-retry';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'REGISTER'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ'
  | 'READ_LIST'
  | 'AUTH_FAILED'
  | 'AUTH_SUCCESS'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED_ACCESS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CSRF_ATTEMPT'
  | 'ADMIN_ACCESS';

export type AuditResource = 
  | 'AUTH'
  | 'SOLDIER'
  | 'DEPARTMENT'
  | 'ROLE'
  | 'ROOM'
  | 'AUDIT_LOG'
  | 'SYSTEM'
  | 'STUDENT'
  | 'COHORT'
  | 'STUDENT_EXIT'
  | 'API_KEY'
  | 'TRUSTED_USER'
  | 'SECURITY'
  | 'PERMISSION';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'ERROR';

export interface AuditLogData {
  userId?: number;
  userEmail?: string;
  apiKeyId?: number; // API key ID if request was made with API key
  action: AuditAction;
  resource: AuditResource;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: AuditStatus;
  errorMessage?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  incidentStatus?: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
  httpMethod?: string; // HTTP method (GET, POST, PUT, DELETE, etc.)
  httpPath?: string; // HTTP path
  requestSize?: number; // Request body size in bytes
  responseSize?: number; // Response body size in bytes
  responseTime?: number; // Response time in milliseconds
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'] || undefined;
}

/**
 * Get user info from request (if authenticated)
 */
function getUserInfo(req: Request): { userId?: number; userEmail?: string; apiKeyId?: number } {
  const user = (req as any).user as JwtPayload | undefined;
  const apiKey = (req as any).apiKey;
  
  if (user) {
    return {
      userId: user.userId,
      userEmail: user.email,
      apiKeyId: apiKey?.id, // Include API key ID if API key was used
    };
  }
  
  // If API key is used, try to get user info from API key
  if (apiKey?.userId) {
    return {
      userId: apiKey.userId,
      userEmail: undefined, // API key doesn't have email
      apiKeyId: apiKey.id,
    };
  }
  
  // If only API key is used (no user)
  if (apiKey?.id) {
    return {
      apiKeyId: apiKey.id,
    };
  }
  
  return {};
}

/**
 * Create an audit log entry
 * Uses retry logic to handle Prisma panics gracefully
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // Use retry logic to handle Prisma panics
    // Get fresh Prisma instance on each retry to ensure we use the recreated client
    await retryPrismaOperation(async () => {
      const currentPrisma = getPrismaClient(); // Always get current instance
      // Build data object, only including fields that exist in the schema
      const auditData: any = {
          userId: data.userId,
          userEmail: data.userEmail,
        apiKeyId: data.apiKeyId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          status: data.status,
          errorMessage: data.errorMessage,
          priority: data.priority,
          incidentStatus: data.incidentStatus,
      };

      // Only add new fields if they exist (for backward compatibility during migration)
      // These fields were added in the migration but Prisma Client might not be regenerated yet
      if (data.httpMethod !== undefined) auditData.httpMethod = data.httpMethod;
      if (data.httpPath !== undefined) auditData.httpPath = data.httpPath;
      if (data.requestSize !== undefined) auditData.requestSize = data.requestSize;
      if (data.responseSize !== undefined) auditData.responseSize = data.responseSize;
      if (data.responseTime !== undefined) auditData.responseTime = data.responseTime;

      await currentPrisma.auditLog.create({
        data: auditData,
      });
    }, 3, 200); // 3 retries with exponential backoff starting at 200ms
  } catch (error: any) {
    // Don't throw - audit logging should never break the application
    // Only log if it's not a panic (panics are already logged by retryPrismaOperation)
    if (error?.name !== 'PrismaClientRustPanicError') {
      console.error('Failed to create audit log after retries:', error);
    }
  }
}

/**
 * Create audit log from Express request
 */
export async function auditFromRequest(
  req: Request,
  action: AuditAction,
  resource: AuditResource,
  options: {
    resourceId?: number;
    details?: Record<string, any>;
    status?: AuditStatus;
    errorMessage?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    incidentStatus?: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
  } = {}
): Promise<void> {
  const userInfo = getUserInfo(req);
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  await createAuditLog({
    ...userInfo,
    action,
    resource,
    resourceId: options.resourceId,
    details: options.details,
    ipAddress,
    userAgent,
    status: options.status || 'SUCCESS',
    errorMessage: options.errorMessage,
    priority: options.priority,
    incidentStatus: options.incidentStatus,
  });
}

/**
 * Audit logging middleware - logs all requests with comprehensive details
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Don't log health checks and static assets
  if (req.path === '/health' || req.path.startsWith('/static') || req.path === '/ready' || req.path === '/live') {
    return next();
  }

  const startTime = Date.now();
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Calculate request size
  const requestSize = req.headers['content-length'] 
    ? parseInt(req.headers['content-length'] as string, 10) 
    : (req.body ? JSON.stringify(req.body).length : 0);

  // Log the request after it completes
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    const responseTime = Date.now() - startTime;
    const responseSize = typeof body === 'string' ? body.length : JSON.stringify(body).length;
    
    // Determine action and resource from route
    let action: AuditAction = 'READ';
    let resource: AuditResource = 'SYSTEM';
    
    // Determine resource from path
    if (path.includes('/soldiers')) resource = 'SOLDIER';
    else if (path.includes('/departments')) resource = 'DEPARTMENT';
    else if (path.includes('/roles')) resource = 'ROLE';
    else if (path.includes('/rooms')) resource = 'ROOM';
    else if (path.includes('/auth')) resource = 'AUTH';
    else if (path.includes('/audit') || path.includes('/soc')) resource = 'AUDIT_LOG';
    else if (path.includes('/api-keys')) resource = 'API_KEY';
    else if (path.includes('/cohorts')) resource = 'COHORT';
    else if (path.includes('/students')) resource = 'STUDENT';
    else if (path.includes('/student-exits')) resource = 'STUDENT_EXIT';
    else if (path.includes('/permissions')) resource = 'PERMISSION';
    else if (path.includes('/tracks')) resource = 'STUDENT';
    else if (path.includes('/classes')) resource = 'STUDENT';
    else if (path.includes('/docs')) resource = 'SYSTEM';
    
    // Determine action from method
    if (method === 'POST') {
      if (path.includes('/login')) action = 'LOGIN';
      else if (path.includes('/register')) action = 'REGISTER';
      else action = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    } else if (method === 'GET') {
      action = path.match(/\/\d+$/) ? 'READ' : 'READ_LIST';
    }
    
    // Determine status from response
    const statusCode = (res as any).statusCode || 200;
    const status: AuditStatus = statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
    
    // Extract resource ID from path if available
    const resourceIdMatch = path.match(/\/(\d+)(?:\/|$)/);
    const resourceId = resourceIdMatch ? parseInt(resourceIdMatch[1]) : undefined;
    
    // Get user info (includes API key ID if used)
    const userInfo = getUserInfo(req);
    
    // Log asynchronously (don't block response)
    createAuditLog({
      ...userInfo,
      action,
      resource,
      resourceId,
      status,
      httpMethod: method,
      httpPath: path,
      requestSize: requestSize > 0 ? requestSize : undefined,
      responseSize: responseSize > 0 ? responseSize : undefined,
      responseTime,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      errorMessage: status === 'FAILURE' ? (typeof body === 'string' ? body.substring(0, 500) : JSON.stringify(body).substring(0, 500)) : undefined,
      details: {
        statusCode,
        ...(req.query && Object.keys(req.query).length > 0 && { queryParams: Object.keys(req.query) }),
      },
    }).catch(console.error);
    
    return originalSend(body);
  };
  
  next();
}

