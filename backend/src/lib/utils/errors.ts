import { Request, Response, NextFunction } from 'express';
import { logger, getCorrelationId } from '../utils/logger';
import { recordError } from './metrics';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.correlationId = correlationId || getCorrelationId();
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = getCorrelationId() || (req as any).correlationId || 'unknown';
  
  if (err instanceof AppError) {
    // Log operational errors at info level (expected errors)
    logger.info({
      type: 'app_error',
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
      correlationId: err.correlationId || correlationId,
      path: req.path,
      method: req.method,
    }, `AppError: ${err.message}`);

    recordError(err.name);

    return res.status(err.statusCode).json({
      error: err.message,
      correlationId: err.correlationId || correlationId,
      ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
    });
  }

  // Handle Prisma panics (Query Engine crashes)
  if (err && typeof err === 'object' && 'name' in err && err.name === 'PrismaClientRustPanicError') {
    // SECURITY: Log only error type, not full error object
    logger.error({
      type: 'prisma_panic',
      correlationId,
      path: req.path,
      method: req.method,
    }, 'Prisma Query Engine panic detected');
    
    recordError('PrismaPanic');
    
    return res.status(503).json({
      error: 'Database temporarily unavailable. Please try again in a moment.',
      retryAfter: 5, // seconds
      correlationId,
    });
  }

  // Handle Prisma errors
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaError = err as any;
    
    logger.warn({
      type: 'prisma_error',
      code: prismaError.code,
      correlationId,
      path: req.path,
      method: req.method,
    }, `Prisma error: ${prismaError.code}`);
    
    recordError(`Prisma_${prismaError.code}`);
    
    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return res.status(409).json({
        error: 'Cannot delete: This resource is being used by other records',
        correlationId,
      });
    }
    
    // Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
        correlationId,
      });
    }
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'A record with this value already exists',
        correlationId,
      });
    }
  }

  // Log unexpected errors (sanitized - no sensitive data)
  // SECURITY: Only log error type and message, never stack traces or sensitive data
  logger.error({
    type: 'unexpected_error',
    error: err?.name || 'Error',
    message: err?.message || 'Unknown error',
    correlationId,
    path: req.path,
    method: req.method,
    // Never log stack traces or full error objects in production
    ...(process.env.NODE_ENV === 'development' && process.env.ALLOW_DEBUG === 'true' 
      ? { stack: err.stack } 
      : {}),
  }, 'Unexpected error occurred');

  recordError('UnexpectedError');

  // SECURITY: Only expose detailed error info in development with explicit debug flag
  // This prevents information leakage in staging/production environments
  const isDebugMode = process.env.NODE_ENV === 'development' && process.env.ALLOW_DEBUG === 'true';
  
  return res.status(500).json({
    error: 'Internal server error',
    correlationId,
    ...(isDebugMode ? { message: err.message, stack: err.stack } : {}),
  });
};

