import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../utils/logger';

/**
 * Middleware to generate and attach correlation/request ID to each request
 * This ID is used to track requests across the entire system
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing correlation ID from header if present (for distributed tracing)
  // Otherwise generate a new one
  const correlationId = 
    (req.headers['x-correlation-id'] as string) || 
    (req.headers['x-request-id'] as string) || 
    uuidv4();

  // Attach to request object
  (req as any).correlationId = correlationId;
  (req as any).requestId = correlationId;

  // Add to response headers for client tracking
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);

  // Store in AsyncLocalStorage for async context propagation
  requestContext.run({ correlationId }, () => {
    next();
  });
}
