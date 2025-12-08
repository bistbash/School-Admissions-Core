import { logger } from '../utils/logger';

/**
 * Simple in-memory metrics collection
 * In production, you'd want to use a proper metrics system like Prometheus
 */
interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
  };
  responseTimes: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
    count: number;
    values: number[]; // Keep last 1000 values for percentile calculation
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  startTime: number;
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
  },
  responseTimes: {
    min: Infinity,
    max: 0,
    avg: 0,
    p95: 0,
    p99: 0,
    count: 0,
    values: [],
  },
  errors: {
    total: 0,
    byType: {},
  },
  startTime: Date.now(),
};

const MAX_RESPONSE_TIME_SAMPLES = 1000;

/**
 * Record a request metric
 */
export function recordRequest(method: string, statusCode: number, duration: number): void {
  metrics.requests.total++;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;

  // Record response time
  if (duration >= 0) {
    metrics.responseTimes.count++;
    metrics.responseTimes.min = Math.min(metrics.responseTimes.min, duration);
    metrics.responseTimes.max = Math.max(metrics.responseTimes.max, duration);

    // Keep only last N samples
    if (metrics.responseTimes.values.length >= MAX_RESPONSE_TIME_SAMPLES) {
      metrics.responseTimes.values.shift();
    }
    metrics.responseTimes.values.push(duration);

    // Calculate average
    const sum = metrics.responseTimes.values.reduce((a, b) => a + b, 0);
    metrics.responseTimes.avg = sum / metrics.responseTimes.values.length;

    // Calculate percentiles
    if (metrics.responseTimes.values.length > 0) {
      const sorted = [...metrics.responseTimes.values].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      metrics.responseTimes.p95 = sorted[p95Index] || 0;
      metrics.responseTimes.p99 = sorted[p99Index] || 0;
    }
  }
}

/**
 * Record an error metric
 */
export function recordError(errorType: string): void {
  metrics.errors.total++;
  metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
}

/**
 * Get current metrics
 */
export function getMetrics(): Metrics {
  return {
    ...metrics,
    responseTimes: {
      ...metrics.responseTimes,
      values: [], // Don't expose the full array
    },
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  metrics.requests.total = 0;
  metrics.requests.byMethod = {};
  metrics.requests.byStatus = {};
  metrics.responseTimes = {
    min: Infinity,
    max: 0,
    avg: 0,
    p95: 0,
    p99: 0,
    count: 0,
    values: [],
  };
  metrics.errors.total = 0;
  metrics.errors.byType = {};
  metrics.startTime = Date.now();
}

/**
 * Log metrics periodically (every 5 minutes)
 */
export function startMetricsLogging(intervalMs: number = 5 * 60 * 1000): void {
  setInterval(() => {
    const uptime = (Date.now() - metrics.startTime) / 1000; // seconds
    const requestsPerSecond = metrics.requests.total / uptime;

    logger.info({
      type: 'metrics',
      ...metrics,
      uptime,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    }, 'System metrics');
  }, intervalMs);
}
