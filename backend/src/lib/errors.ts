import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
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
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
    });
  }

  // Handle Prisma panics (Query Engine crashes)
  if (err && typeof err === 'object' && 'name' in err && err.name === 'PrismaClientRustPanicError') {
    // SECURITY: Log only error type, not full error object
    console.error('Prisma Query Engine panic detected');
    return res.status(503).json({
      error: 'Database temporarily unavailable. Please try again in a moment.',
      retryAfter: 5, // seconds
    });
  }

  // Handle Prisma errors
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaError = err as any;
    
    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return res.status(409).json({
        error: 'Cannot delete: This resource is being used by other records',
      });
    }
    
    // Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
      });
    }
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'A record with this value already exists',
      });
    }
  }

  // Log unexpected errors (sanitized - no sensitive data)
  // SECURITY: Only log error type and message, never stack traces or sensitive data
  const sanitizedError = {
    name: err?.name || 'Error',
    message: err?.message || 'Unknown error',
    // Never log stack traces or full error objects in production
  };
  console.error('Unexpected error:', sanitizedError);

  // SECURITY: Only expose detailed error info in development with explicit debug flag
  // This prevents information leakage in staging/production environments
  const isDebugMode = process.env.NODE_ENV === 'development' && process.env.ALLOW_DEBUG === 'true';
  
  return res.status(500).json({
    error: 'Internal server error',
    ...(isDebugMode ? { message: err.message, stack: err.stack } : {}),
  });
};

