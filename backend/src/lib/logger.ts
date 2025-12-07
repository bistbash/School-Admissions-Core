import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage to maintain request context across async operations
export const requestContext = new AsyncLocalStorage<{ correlationId: string }>();

/**
 * Get the current correlation ID from the request context
 */
export function getCorrelationId(): string | undefined {
  const context = requestContext.getStore();
  return context?.correlationId;
}

/**
 * Create a logger instance
 * In production, logs are JSON formatted for log aggregation systems
 * In development, logs are prettified for readability
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  // Add correlation ID to all logs if available
  mixin() {
    const correlationId = getCorrelationId();
    return correlationId ? { correlationId } : {};
  },
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(bindings: Record<string, any>) {
  return logger.child(bindings);
}
