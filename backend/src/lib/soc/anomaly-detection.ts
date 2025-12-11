import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { emitSecurityEvent, SecurityEvent } from './soc-websocket';
import * as stats from 'simple-statistics';

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  score: number;
  detectedAt: Date;
}

export class AnomalyDetectionService {
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Check if a user is an admin
   * Admins should be excluded from anomaly detection as they have full system access
   */
  private async isAdminUser(userId?: number | null): Promise<boolean> {
    if (!userId) return false;
    
    try {
      const user = await prisma.soldier.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
      });
      return user?.isAdmin ?? false;
    } catch (error) {
      logger.error({ error, userId }, 'Error checking if user is admin');
      return false; // On error, don't exclude (safer)
    }
  }

  /**
   * Check if a log entry is a SOC operation (should be excluded from anomaly detection)
   * SOC operations include: managing incidents, viewing audit logs, blocking IPs, etc.
   */
  private isSOCOperation(log: any): boolean {
    // Exclude SOC-related operations on audit logs
    if (log.resource === 'AUDIT_LOG') {
      return true; // All operations on audit logs are SOC operations
    }
    
    // Exclude operations on SOC-related resources
    if (log.resource === 'SECURITY' || log.resource === 'TRUSTED_USER') {
      return true;
    }
    
    // Exclude UPDATE/DELETE operations on incidents (resolving, updating incidents)
    if (log.incidentStatus !== null && log.incidentStatus !== undefined) {
      if (log.action === 'UPDATE' || log.action === 'DELETE') {
        return true;
      }
    }
    
    // Exclude operations on SOC endpoints (from httpPath in details)
    let details: any = null;
    if (log.details) {
      try {
        details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Check httpPath from details or from log directly
    const httpPath = details?.httpPath || log.httpPath;
    if (httpPath && (
      httpPath.includes('/soc/') ||
      httpPath.includes('/api/soc/') ||
      httpPath.includes('/audit') ||
      httpPath.includes('/api/audit')
    )) {
      return true;
    }
    
    // Exclude READ operations on SOC endpoints (viewing incidents, logs, etc.)
    if (log.action === 'READ' || log.action === 'READ_LIST') {
      if (httpPath && (
        httpPath.includes('/soc/') ||
        httpPath.includes('/api/soc/')
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect anomalies in user activity
   */
  async detectUserActivityAnomalies(
    userId: number, 
    timeWindow: number = 3600000
  ): Promise<AnomalyDetectionResult[]> {
    const oneHourAgo = new Date(Date.now() - timeWindow);
    
    // Get recent activity for user (excluding SOC operations)
    const allRecentLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter out SOC operations
    const recentLogs = allRecentLogs.filter(log => !this.isSOCOperation(log));

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for unusual activity volume
    const activityCount = recentLogs.length;
    const avgActivity = await this.getAverageActivity(userId);
    
    if (activityCount > avgActivity * 3 && avgActivity > 0) {
      anomalies.push({
        isAnomaly: true,
        severity: 'HIGH',
        reason: `Unusual activity volume: ${activityCount} actions in last hour (avg: ${avgActivity.toFixed(1)})`,
        score: activityCount / Math.max(avgActivity, 1),
        detectedAt: new Date()
      });
    }

    // Check for failed login attempts
    const failedLogins = recentLogs.filter(log => 
      log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED'
    ).length;

    if (failedLogins > 5) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Multiple failed login attempts: ${failedLogins}`,
        score: failedLogins,
        detectedAt: new Date()
      });
    }

    // Check for unauthorized access attempts
    const unauthorizedAttempts = recentLogs.filter(log =>
      log.action === 'UNAUTHORIZED_ACCESS'
    ).length;

    if (unauthorizedAttempts > 0) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Unauthorized access attempts detected: ${unauthorizedAttempts}`,
        score: unauthorizedAttempts * 10,
        detectedAt: new Date()
      });
    }

    // Check for unusual IP addresses
    const uniqueIPs = new Set(recentLogs.map(log => log.ipAddress).filter(Boolean));
    if (uniqueIPs.size > 3) {
      anomalies.push({
        isAnomaly: true,
        severity: 'MEDIUM',
        reason: `Multiple IP addresses detected: ${uniqueIPs.size}`,
        score: uniqueIPs.size,
        detectedAt: new Date()
      });
    }

    return anomalies;
  }

  /**
   * Detect anomalies in IP activity
   */
  async detectIPAnomalies(
    ipAddress: string, 
    timeWindow: number = 3600000
  ): Promise<AnomalyDetectionResult[]> {
    const oneHourAgo = new Date(Date.now() - timeWindow);
    
    // Get all logs and filter out SOC operations
    const allRecentLogs = await prisma.auditLog.findMany({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo }
      }
    });

    // Filter out SOC operations
    const recentLogs = allRecentLogs.filter(log => !this.isSOCOperation(log));

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for brute force attempts
    // Only count actual failed authentication attempts, not all failures
    const failedAuthAttempts = recentLogs.filter(log =>
      (log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED') &&
      log.status === 'FAILURE'
    ).length;

    // Only flag if there are multiple failed attempts from same IP
    // This indicates a real brute force attack, not just normal failures
    if (failedAuthAttempts >= 10) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Potential brute force attack: ${failedAuthAttempts} failed authentication attempts from same IP`,
        score: failedAuthAttempts,
        detectedAt: new Date()
      });
    }

    // Check for multiple user accounts from same IP
    const uniqueUsers = new Set(recentLogs.map(log => log.userId).filter(Boolean));
    if (uniqueUsers.size > 5) {
      anomalies.push({
        isAnomaly: true,
        severity: 'HIGH',
        reason: `Multiple user accounts from same IP: ${uniqueUsers.size}`,
        score: uniqueUsers.size,
        detectedAt: new Date()
      });
    }

    // Check for unusual request patterns (bot detection)
    const requestTimes = recentLogs.map(log => new Date(log.createdAt).getTime());
    if (requestTimes.length > 10) {
      const intervals: number[] = [];
      for (let i = 1; i < requestTimes.length; i++) {
        intervals.push(requestTimes[i] - requestTimes[i - 1]);
      }
      
      if (intervals.length > 0) {
        const meanInterval = stats.mean(intervals);
        const stdDev = stats.standardDeviation(intervals);
        
        // Check for automated/bot-like behavior (very consistent intervals)
        if (meanInterval > 0 && stdDev < meanInterval * 0.1) {
          anomalies.push({
            isAnomaly: true,
            severity: 'MEDIUM',
            reason: 'Automated/bot-like behavior detected (consistent request intervals)',
            score: 5,
            detectedAt: new Date()
          });
        }

        // Check for very high request rate
        const avgInterval = meanInterval;
        if (avgInterval > 0 && avgInterval < 100) { // Less than 100ms between requests
          anomalies.push({
            isAnomaly: true,
            severity: 'HIGH',
            reason: `Very high request rate detected: ${(1000 / avgInterval).toFixed(1)} requests/second`,
            score: 1000 / avgInterval,
            detectedAt: new Date()
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Get average activity for a user (per hour)
   * Excludes SOC operations from the calculation
   */
  private async getAverageActivity(userId: number): Promise<number> {
    // Skip calculation for admin users - they have full access
    const isAdmin = await this.isAdminUser(userId);
    if (isAdmin) {
      return 0; // Return 0 so admin activity never triggers volume-based anomalies
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all logs and filter out SOC operations
    const allLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        resource: true,
        action: true,
        incidentStatus: true,
        details: true,
        httpPath: true
      }
    });

    // Filter out SOC operations
    const userLogs = allLogs.filter(log => !this.isSOCOperation(log));
    const totalLogs = userLogs.length;

    // Average per hour over 30 days
    return totalLogs / (30 * 24);
  }

  /**
   * Monitor and detect anomalies continuously
   */
  async startContinuousMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Anomaly detection monitoring already started');
      return;
    }

    this.isMonitoring = true;
    logger.info({ intervalMinutes }, 'Starting continuous anomaly detection monitoring');

    const checkAnomalies = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 3600000);
        
        // Get recent security events (excluding SOC operations)
        const allRecentSecurityEvents = await prisma.auditLog.findMany({
          where: {
            OR: [
              { action: 'LOGIN_FAILED' },
              { action: 'AUTH_FAILED' },
              { action: 'UNAUTHORIZED_ACCESS' },
              { status: 'FAILURE' }
            ],
            createdAt: { gte: oneHourAgo }
          },
          take: 100 // Limit to prevent overload
        });

        // Filter out SOC operations - we only want real security events
        const recentSecurityEvents = allRecentSecurityEvents.filter(event => !this.isSOCOperation(event));

        // Check each event for anomalies
        for (const event of recentSecurityEvents) {
          // Skip if this is already a SOC operation
          if (this.isSOCOperation(event)) {
            continue;
          }

          // Skip if user is admin - admins have full system access
          if (event.userId) {
            const isAdmin = await this.isAdminUser(event.userId);
            if (isAdmin) {
              logger.debug({ userId: event.userId, eventId: event.id }, 'Skipping anomaly detection for admin user activity');
              continue; // Admins don't trigger anomalies
            }
          }

          // For UNAUTHORIZED_ACCESS or AUTH_FAILED, only check if there's a pattern of multiple failures
          // Don't create incidents for single unauthenticated requests unless there's a clear pattern
          if (event.action === 'UNAUTHORIZED_ACCESS' || event.action === 'AUTH_FAILED') {
            // Only check IP anomalies for unauthenticated events (not user anomalies)
            if (event.ipAddress) {
              const ipAnomalies = await this.detectIPAnomalies(event.ipAddress);
              // Only create incident if there are multiple failures from same IP
              const criticalAnomalies = ipAnomalies.filter(a => 
                a.isAnomaly && (a.severity === 'CRITICAL' || a.severity === 'HIGH')
              );
              for (const anomaly of criticalAnomalies) {
                await this.handleAnomaly(anomaly, event, 'IP');
              }
            }
            continue; // Skip user anomaly check for unauthenticated events
          }

          // For authenticated users, check both user and IP anomalies
          if (event.userId) {
            // Double-check admin status (should already be filtered above, but safety check)
            const isAdmin = await this.isAdminUser(event.userId);
            if (!isAdmin) {
              const userAnomalies = await this.detectUserActivityAnomalies(event.userId);
              for (const anomaly of userAnomalies) {
                if (anomaly.isAnomaly) {
                  await this.handleAnomaly(anomaly, event, 'USER');
                }
              }
            }
          }

          if (event.ipAddress) {
            const ipAnomalies = await this.detectIPAnomalies(event.ipAddress);
            for (const anomaly of ipAnomalies) {
              if (anomaly.isAnomaly) {
                await this.handleAnomaly(anomaly, event, 'IP');
              }
            }
          }
        }
      } catch (error) {
        logger.error({ error }, 'Error in continuous anomaly monitoring');
      }
    };

    // Run immediately, then on interval
    await checkAnomalies();
    this.monitoringInterval = setInterval(checkAnomalies, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Stopped continuous anomaly detection monitoring');
  }

  /**
   * Handle detected anomaly
   */
  private async handleAnomaly(
    anomaly: AnomalyDetectionResult, 
    event: any,
    source: 'USER' | 'IP'
  ): Promise<void> {
    // Emit real-time alert
    const securityEvent: SecurityEvent = {
      type: 'ANOMALY',
      severity: anomaly.severity,
      data: {
        anomaly,
        event: {
          id: event.id,
          action: event.action,
          resource: event.resource,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userEmail: event.userEmail
        },
        source
      },
      timestamp: new Date()
    };

    emitSecurityEvent(securityEvent);

    // Mark as incident if critical or high
    // But only if the event itself is not a false positive
    if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
      // Final safety check: Never create incidents for admin users
      if (event.userId) {
        const isAdmin = await this.isAdminUser(event.userId);
        if (isAdmin) {
          logger.info({ 
            eventId: event.id, 
            userId: event.userId,
            anomaly,
            reason: 'Skipping incident creation for admin user'
          }, 'Anomaly detected but not creating incident (admin user)');
          return;
        }
      }

      // Don't create incidents for UNAUTHENTICATED events unless it's a clear attack pattern
      // (e.g., multiple failed attempts from same IP)
      if (!event.userId && !event.apiKeyId) {
        // For unauthenticated events, only create incidents for CRITICAL anomalies
        // (like brute force attacks), not for HIGH severity
        if (anomaly.severity !== 'CRITICAL') {
          logger.info({ 
            eventId: event.id, 
            anomaly,
            reason: 'Skipping incident creation for unauthenticated HIGH severity event'
          }, 'Anomaly detected but not creating incident (unauthenticated HIGH severity)');
          return;
        }
      }

      try {
        // Check if incident already exists for this event
        const existingLog = await prisma.auditLog.findUnique({
          where: { id: event.id },
          select: { incidentStatus: true }
        });

        // Only create new incident if one doesn't already exist
        if (!existingLog || !existingLog.incidentStatus || existingLog.incidentStatus === 'RESOLVED' || existingLog.incidentStatus === 'FALSE_POSITIVE') {
          await prisma.auditLog.update({
            where: { id: event.id },
            data: {
              incidentStatus: 'NEW',
              priority: anomaly.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
              details: JSON.stringify({
                ...(event.details ? (typeof event.details === 'string' ? JSON.parse(event.details) : event.details) : {}),
                anomalyDetected: true,
                anomalyReason: anomaly.reason,
                anomalyScore: anomaly.score,
                detectedAt: anomaly.detectedAt,
                detectedBy: 'anomaly-detection-service',
                source
              })
            }
          });

        logger.warn({ 
          eventId: event.id, 
          anomaly,
          source 
        }, 'Security anomaly detected and marked as incident');
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Failed to update event with anomaly information');
      }
    } else {
      logger.info({ 
        eventId: event.id, 
        anomaly,
        source 
      }, 'Security anomaly detected (low/medium severity)');
    }
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();
