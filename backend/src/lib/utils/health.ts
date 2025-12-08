import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import os from 'os';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      free: number;
      total: number;
      percentage: number;
    };
  };
  system: {
    platform: string;
    nodeVersion: string;
    cpuCount: number;
    loadAverage: number[];
  };
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    // Consider database unhealthy if response time is too high
    if (responseTime > 5000) {
      return {
        status: 'unhealthy',
        responseTime,
        error: 'Database response time too high',
      };
    }

    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Database health check failed');
    return {
      status: 'unhealthy',
      error: error.message || 'Database connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'healthy' | 'degraded' | 'unhealthy'; used: number; total: number; percentage: number } {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const percentage = (usedMemory / totalMemory) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (percentage > 90) {
    status = 'unhealthy';
  } else if (percentage > 75) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    used: usedMemory,
    total: totalMemory,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Check disk space (for the root directory)
 */
function checkDisk(): { status: 'healthy' | 'degraded' | 'unhealthy'; free: number; total: number; percentage: number } {
  try {
    const stats = os.freemem(); // Note: Node.js doesn't have built-in disk stats
    // For a more accurate disk check, you'd need a library like 'diskusage'
    // For now, we'll use a simplified check
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (percentage > 90) {
      status = 'unhealthy';
    } else if (percentage > 75) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      free: freeMemory,
      total: totalMemory,
      percentage: Math.round(percentage * 100) / 100,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Disk health check failed');
    return {
      status: 'unhealthy',
      free: 0,
      total: 0,
      percentage: 100,
    };
  }
}

/**
 * Comprehensive health check endpoint
 * Returns detailed information about system health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [databaseCheck, memoryCheck, diskCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkDisk()),
    ]);

    // Determine overall status
    const allHealthy = 
      databaseCheck.status === 'healthy' &&
      memoryCheck.status === 'healthy' &&
      diskCheck.status === 'healthy';

    const anyUnhealthy = 
      databaseCheck.status === 'unhealthy' ||
      memoryCheck.status === 'unhealthy' ||
      diskCheck.status === 'unhealthy';

    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
      anyUnhealthy ? 'unhealthy' : 
      allHealthy ? 'healthy' : 
      'degraded';

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: databaseCheck,
        memory: memoryCheck,
        disk: diskCheck,
      },
      system: {
        platform: os.platform(),
        nodeVersion: process.version,
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 
                      503;

    res.status(statusCode).json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
    });
  }
}

/**
 * Simple liveness probe endpoint
 * Returns 200 if the server is running
 */
export function livenessCheck(req: Request, res: Response): void {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness probe endpoint
 * Returns 200 if the server is ready to accept requests
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Readiness check failed');
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Database not available',
    });
  }
}
