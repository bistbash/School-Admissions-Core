import { Request, Response, NextFunction } from 'express';
import { prisma, getPrismaClient } from '../database/prisma';
import { JwtPayload } from '../auth/auth';
import { retryPrismaOperation } from '../database/prisma-retry';
import { getCorrelationId } from '../utils/logger';

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
  isPinned?: boolean; // Whether this log should be pinned (important operations)
  pinnedBy?: number; // User ID who pinned it (null for auto-pinned)
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
 * Determine if a log should be auto-pinned based on importance
 * Important operations:
 * - API KEY creation
 * - STUDENT operations (CREATE, UPDATE, DELETE, READ_LIST via API)
 * - Critical security events
 */
function shouldAutoPinLog(data: AuditLogData): boolean {
  // Only pin successful operations from this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // API KEY creation is always important
  if (data.resource === 'API_KEY' && data.action === 'CREATE') {
    return true;
  }

  // STUDENT operations via API are important
  if (data.resource === 'STUDENT') {
    // All write operations on students
    if (data.action === 'CREATE' || data.action === 'UPDATE' || data.action === 'DELETE') {
      return true;
    }
    // READ_LIST via API (not via frontend) - check if it's an API call
    if (data.action === 'READ_LIST' && data.apiKeyId) {
      return true;
    }
  }

  // Critical security events
  if (data.resource === 'AUTH' || data.resource === 'SECURITY') {
    if (data.action === 'AUTH_FAILED' && data.priority === 'CRITICAL') {
      return true;
    }
    if (data.action === 'UNAUTHORIZED_ACCESS' && data.priority === 'HIGH') {
      return true;
    }
  }

  // Operations via API key on sensitive resources
  if (data.apiKeyId && (
    data.resource === 'SOLDIER' ||
    data.resource === 'STUDENT' ||
    data.resource === 'COHORT' ||
    data.resource === 'PERMISSION'
  )) {
    // Any write operation via API
    if (data.action === 'CREATE' || data.action === 'UPDATE' || data.action === 'DELETE') {
      return true;
    }
  }

  return false;
}

/**
 * Get user info from request (if authenticated)
 * Returns info about whether request came from API key or website (JWT)
 */
function getUserInfo(req: Request): { 
  userId?: number; 
  userEmail?: string; 
  apiKeyId?: number;
  authMethod?: 'API_KEY' | 'JWT' | 'UNAUTHENTICATED';
} {
  const user = (req as any).user as JwtPayload | undefined;
  const apiKey = (req as any).apiKey;
  
  // Check if request came via API key
  if (apiKey?.id) {
    return {
      userId: apiKey.userId || user?.userId, // API key's owner or user from JWT
      userEmail: user?.email, // Email from JWT if available
      apiKeyId: apiKey.id,
      authMethod: 'API_KEY', // Request came via API key
    };
  }
  
  // Check if request came via JWT (website)
  if (user) {
    return {
      userId: user.userId,
      userEmail: user.email,
      authMethod: 'JWT', // Request came via website (JWT token)
    };
  }
  
  // Unauthenticated request
  return {
    authMethod: 'UNAUTHENTICATED',
  };
}

// Rate limiting: track concurrent audit log operations
let activeAuditOperations = 0;
const MAX_CONCURRENT_AUDIT_OPS = 10;
const AUDIT_QUEUE: Array<{ data: AuditLogData; resolve: () => void; reject: (err: any) => void }> = [];

/**
 * Process audit log queue
 */
async function processAuditQueue() {
  if (activeAuditOperations >= MAX_CONCURRENT_AUDIT_OPS || AUDIT_QUEUE.length === 0) {
    return;
  }

  const item = AUDIT_QUEUE.shift();
  if (!item) return;

  activeAuditOperations++;
  try {
    await createAuditLogInternal(item.data);
    item.resolve();
  } catch (error) {
    item.reject(error);
  } finally {
    activeAuditOperations--;
    // Process next item in queue
    setImmediate(processAuditQueue);
  }
}

/**
 * Internal function to create audit log entry
 * Uses retry logic to handle Prisma panics gracefully
 */
async function createAuditLogInternal(data: AuditLogData): Promise<void> {
  try {
    // Use retry logic to handle Prisma panics
    // Get fresh Prisma instance on each retry to ensure we use the recreated client
    await retryPrismaOperation(async () => {
      const currentPrisma = getPrismaClient(); // Always get current instance
      // Build data object, only including fields that exist in the schema
      // Filter out undefined values to avoid Prisma issues
      const auditData: any = {};
      
      // Required fields
      auditData.action = data.action;
      auditData.resource = data.resource;
      auditData.status = data.status;
      
      // Optional fields - only add if defined
      if (data.userId !== undefined && data.userId !== null) auditData.userId = data.userId;
      if (data.userEmail !== undefined && data.userEmail !== null) auditData.userEmail = data.userEmail;
      if (data.apiKeyId !== undefined && data.apiKeyId !== null) auditData.apiKeyId = data.apiKeyId;
      if (data.resourceId !== undefined && data.resourceId !== null) auditData.resourceId = data.resourceId;
      if (data.details !== undefined && data.details !== null) {
        auditData.details = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
      }
      if (data.ipAddress !== undefined && data.ipAddress !== null) auditData.ipAddress = data.ipAddress;
      if (data.userAgent !== undefined && data.userAgent !== null) auditData.userAgent = data.userAgent;
      if (data.errorMessage !== undefined && data.errorMessage !== null) auditData.errorMessage = data.errorMessage;
      if (data.priority !== undefined && data.priority !== null) auditData.priority = data.priority;
      if (data.incidentStatus !== undefined && data.incidentStatus !== null) auditData.incidentStatus = data.incidentStatus;
      if (data.httpMethod !== undefined && data.httpMethod !== null) auditData.httpMethod = data.httpMethod;
      if (data.httpPath !== undefined && data.httpPath !== null) auditData.httpPath = data.httpPath;
      if (data.requestSize !== undefined && data.requestSize !== null) auditData.requestSize = data.requestSize;
      if (data.responseSize !== undefined && data.responseSize !== null) auditData.responseSize = data.responseSize;
      if (data.responseTime !== undefined && data.responseTime !== null) auditData.responseTime = data.responseTime;

      // Auto-pin important operations (only for successful operations from this week)
      const shouldAutoPin = shouldAutoPinLog(data);
      if (shouldAutoPin && data.status === 'SUCCESS') {
        auditData.isPinned = true;
        auditData.pinnedAt = new Date();
        auditData.pinnedBy = null; // null = auto-pinned
      } else if (data.isPinned !== undefined) {
        // Manual pinning
        auditData.isPinned = data.isPinned;
        if (data.isPinned) {
          auditData.pinnedAt = new Date();
          if (data.pinnedBy !== undefined && data.pinnedBy !== null) {
            auditData.pinnedBy = data.pinnedBy;
          } else {
            auditData.pinnedBy = null;
          }
        }
      }

      const created = await currentPrisma.auditLog.create({
        data: auditData,
      });
      
      // Log successful creation for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] Created log: ${created.id} - ${data.action} ${data.resource} - ${data.status}`);
      }
    }, 3, 200); // 3 retries with exponential backoff starting at 200ms
  } catch (error: any) {
    // Don't throw - audit logging should never break the application
    // Only log if it's not a panic (panics are already logged by retryPrismaOperation)
    if (error?.name !== 'PrismaClientRustPanicError') {
      console.error('Failed to create audit log after retries:', error);
      console.error('Audit log data that failed:', {
        action: data.action,
        resource: data.resource,
        status: data.status,
        httpMethod: data.httpMethod,
        httpPath: data.httpPath,
      });
    }
  }
}

/**
 * Create an audit log entry
 * Uses queue to prevent too many concurrent operations
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  // If we're under the limit, process immediately
  if (activeAuditOperations < MAX_CONCURRENT_AUDIT_OPS) {
    activeAuditOperations++;
    try {
      await createAuditLogInternal(data);
    } finally {
      activeAuditOperations--;
      processAuditQueue();
    }
  } else {
    // Queue the operation
    return new Promise<void>((resolve, reject) => {
      AUDIT_QUEUE.push({ data, resolve, reject });
      processAuditQueue();
    });
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
 * IMPORTANT: This middleware logs ALL HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * for all API routes to ensure complete audit trail for SOC monitoring
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Don't log health checks, static assets, and non-API routes
  const path = req.path || req.url?.split('?')[0] || '';
  
  // Skip logging for specific paths
  if (
    path === '/health' || 
    path === '/ready' || 
    path === '/live' ||
    path.startsWith('/static') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path === '/'
  ) {
    return next();
  }
  
  // Only log API routes - this is critical for SOC
  // Logs ALL methods: GET, POST, PUT, PATCH, DELETE
  const isAPIRoute = path.startsWith('/api') || path.startsWith('/soc') || path.startsWith('/audit');
  if (!isAPIRoute) {
    return next();
  }

  // Mark that audit middleware is handling this request to prevent duplicate logs
  (req as any).__auditLogged = false;
  
  const startTime = Date.now();
  const method = req.method.toUpperCase(); // GET, POST, PUT, PATCH, DELETE - ALL methods are logged
  const actualPath = req.path || req.url?.split('?')[0] || '';
  
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
    if (actualPath.includes('/soldiers')) resource = 'SOLDIER';
    else if (actualPath.includes('/departments')) resource = 'DEPARTMENT';
    else if (actualPath.includes('/roles')) resource = 'ROLE';
    else if (actualPath.includes('/rooms')) resource = 'ROOM';
    else if (actualPath.includes('/auth')) resource = 'AUTH';
    else if (actualPath.includes('/audit') || actualPath.includes('/soc')) resource = 'AUDIT_LOG';
    else if (actualPath.includes('/api-keys')) resource = 'API_KEY';
    else if (actualPath.includes('/cohorts')) resource = 'COHORT';
    else if (actualPath.includes('/students')) resource = 'STUDENT';
    else if (actualPath.includes('/student-exits')) resource = 'STUDENT_EXIT';
    else if (actualPath.includes('/permissions')) resource = 'PERMISSION';
    else if (actualPath.includes('/tracks')) resource = 'STUDENT';
    else if (actualPath.includes('/classes')) resource = 'STUDENT';
    else if (actualPath.includes('/docs')) resource = 'SYSTEM';
    
    // Determine action from method
    // IMPORTANT: All HTTP methods (GET, POST, PUT, PATCH, DELETE) are logged
    if (method === 'POST') {
      if (actualPath.includes('/login')) action = 'LOGIN';
      else if (actualPath.includes('/register')) action = 'REGISTER';
      else action = 'CREATE'; // All POST requests are logged as CREATE
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE'; // All PUT/PATCH requests are logged as UPDATE
    } else if (method === 'DELETE') {
      action = 'DELETE'; // All DELETE requests are logged as DELETE
    } else if (method === 'GET') {
      action = actualPath.match(/\/\d+$/) ? 'READ' : 'READ_LIST'; // GET requests are logged as READ/READ_LIST
    }
    // Note: Other methods (HEAD, OPTIONS, etc.) will default to 'READ' action but still be logged
    
    // Determine status from response
    const statusCode = (res as any).statusCode || 200;
    const status: AuditStatus = statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
    
    // Extract resource ID from path if available
    const resourceIdMatch = actualPath.match(/\/(\d+)(?:\/|$)/);
    const resourceId = resourceIdMatch ? parseInt(resourceIdMatch[1]) : undefined;
    
    // Get user info (includes API key ID if used)
    const userInfo = getUserInfo(req);
    
    // Get correlation ID if available
    const correlationId = getCorrelationId();
    
    // Sanitize headers (remove sensitive data)
    const sanitizedHeaders: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-csrf-token'];
    Object.keys(req.headers).forEach(key => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitizedHeaders[key] = String(req.headers[key] || '');
      } else {
        sanitizedHeaders[key] = '[REDACTED]';
      }
    });
    
    // Get API key info if available
    const apiKey = (req as any).apiKey;
    const apiKeyInfo = apiKey ? {
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      apiKeyUserId: apiKey.userId, // Owner of the API key
    } : {};
    
    // Mark that we're logging this request to prevent duplicate logs from other middlewares
    (req as any).__auditLogged = true;
    
    // Extract error message from response body for better debugging
    let errorMessage: string | undefined = undefined;
    if (status === 'FAILURE') {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          errorMessage = parsed.error || parsed.message || body.substring(0, 500);
        } catch {
          errorMessage = body.substring(0, 500);
        }
      } else if (typeof body === 'object' && body !== null) {
        errorMessage = (body as any).error || (body as any).message || JSON.stringify(body).substring(0, 500);
      }
    }
    
    // Log asynchronously (don't block response)
    // Always log API requests - this is critical for SOC monitoring
    // IMPORTANT: This logs ALL HTTP methods including GET, POST, PUT, PATCH, DELETE
    createAuditLog({
      ...userInfo,
      action,
      resource,
      resourceId,
      status,
      httpMethod: method, // GET, POST, PUT, PATCH, DELETE
      httpPath: actualPath,
      requestSize: requestSize > 0 ? requestSize : undefined,
      responseSize: responseSize > 0 ? responseSize : undefined,
      responseTime,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      errorMessage,
      details: {
        correlationId,
        statusCode,
        endpoint: actualPath,
        method: method, // GET, POST, PUT, PATCH, DELETE - ALL methods are logged
        httpMethod: method, // Explicitly include HTTP method
        authMethod: userInfo.authMethod, // How the request was authenticated: API_KEY, JWT, or UNAUTHENTICATED
        ...(req.query && Object.keys(req.query).length > 0 && { queryParams: req.query }),
        ...(Object.keys(sanitizedHeaders).length > 0 && { headers: sanitizedHeaders }),
        // Include request body for POST, PUT, PATCH, DELETE (important for audit trail)
        ...(req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0 && { requestBody: req.body }),
        ...apiKeyInfo,
        // Add full error details for debugging
        ...(status === 'FAILURE' && errorMessage && { errorDetails: errorMessage }),
      },
    }).catch((error) => {
      // Log errors but don't break the request
      // Only log if it's not a panic (panics are already logged by retryPrismaOperation)
      if (error?.name !== 'PrismaClientRustPanicError') {
        console.error('Failed to create audit log:', error);
        console.error('Failed audit log details:', {
          method,
          path: actualPath,
          action,
          resource,
          status,
        });
      }
    });
    
    return originalSend(body);
  };
  
  next();
}

