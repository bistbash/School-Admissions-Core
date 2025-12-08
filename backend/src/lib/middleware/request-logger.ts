import { Request, Response, NextFunction } from 'express';
import { logger, getCorrelationId } from '../utils/logger';
import { recordRequest } from '../utils/metrics';

/**
 * Request/Response logging middleware
 * Logs all HTTP requests with performance metrics
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip logging for health checks and static assets
  if (req.path === '/health' || req.path === '/ready' || req.path === '/live' || req.path.startsWith('/static')) {
    return next();
  }

  const startTime = Date.now();
  const correlationId = getCorrelationId() || (req as any).correlationId || 'unknown';

  // Log request
  logger.info({
    type: 'http_request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.userId,
  }, `Incoming ${req.method} ${req.path}`);

  // Capture response
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record metrics
    recordRequest(req.method, statusCode, duration);

    // Log response
    logger.info({
      type: 'http_response',
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      durationMs: duration,
      responseSize: typeof body === 'string' ? body.length : JSON.stringify(body).length,
    }, `${req.method} ${req.path} ${statusCode} - ${duration}ms`);

    // Log slow requests as warnings
    if (duration > 1000) {
      logger.warn({
        type: 'slow_request',
        method: req.method,
        path: req.path,
        duration,
        statusCode,
      }, `Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Log errors
    if (statusCode >= 400) {
      logger.error({
        type: 'http_error',
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        error: typeof body === 'string' ? body : body?.error || 'Unknown error',
      }, `Error ${statusCode} on ${req.method} ${req.path}`);
    }

    return originalSend(body);
  };

  next();
}
