import { logger } from '../utils/logger';
import { prisma } from '../database/prisma';

/**
 * SOC-specific metrics for security operations
 * Tracks security events, incident resolution times, and analyst activity
 */
interface SOCMetrics {
  securityEvents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent24h: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    falsePositives: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    avgResolutionTime: number; // in hours
  };
  analystActivity: {
    totalActions: number;
    byAnalyst: Record<number, number>;
    avgActionsPerDay: number;
  };
  ipBlocking: {
    totalBlocked: number;
    activeBlocks: number;
    recentBlocks24h: number;
  };
  trustedUsers: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  performance: {
    avgQueryTime: number; // in ms
    slowQueries: number;
  };
}

/**
 * Get comprehensive SOC metrics
 */
export async function getSOCMetrics(): Promise<SOCMetrics> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [securityEvents, incidents, blockedIPs, trustedUsers, recentLogs] = await Promise.all([
    // Security events
    prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'LOGIN_FAILED' },
          { action: 'AUTH_FAILED' },
          { action: 'UNAUTHORIZED_ACCESS' },
          { status: 'FAILURE' },
        ],
      },
      select: {
        action: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    }),

    // Incidents
    prisma.auditLog.findMany({
      where: {
        incidentStatus: { not: null },
      },
      select: {
        incidentStatus: true,
        priority: true,
        resolvedAt: true,
        createdAt: true,
        assignedTo: true,
      },
    }),

    // Blocked IPs
    prisma.blockedIP.findMany({
      where: { isActive: true },
      select: {
        blockedAt: true,
      },
    }),

    // Trusted users
    prisma.trustedUser.findMany({
      select: {
        userId: true,
        ipAddress: true,
        email: true,
        expiresAt: true,
      },
    }),

    // Recent logs for performance metrics
    prisma.auditLog.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
      },
      take: 1000,
      select: {
        createdAt: true,
      },
    }),
  ]);

  // Calculate security events metrics
  const securityEventsMetrics = {
    total: securityEvents.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    recent24h: securityEvents.filter(e => e.createdAt >= oneDayAgo).length,
  };

  securityEvents.forEach(event => {
    securityEventsMetrics.byType[event.action] = 
      (securityEventsMetrics.byType[event.action] || 0) + 1;
    if (event.priority) {
      securityEventsMetrics.bySeverity[event.priority] = 
        (securityEventsMetrics.bySeverity[event.priority] || 0) + 1;
    }
  });

  // Calculate incident metrics
  const incidentMetrics = {
    total: incidents.length,
    open: incidents.filter(i => 
      i.incidentStatus && 
      ['NEW', 'INVESTIGATING', 'ESCALATED'].includes(i.incidentStatus)
    ).length,
    resolved: incidents.filter(i => i.incidentStatus === 'RESOLVED').length,
    falsePositives: incidents.filter(i => i.incidentStatus === 'FALSE_POSITIVE').length,
    byPriority: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    avgResolutionTime: 0,
  };

  const resolvedIncidents = incidents.filter(i => 
    i.incidentStatus === 'RESOLVED' && i.resolvedAt && i.createdAt
  );

  if (resolvedIncidents.length > 0) {
    const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
      const resolutionTime = new Date(incident.resolvedAt!).getTime() - 
                            new Date(incident.createdAt).getTime();
      return sum + resolutionTime;
    }, 0);
    incidentMetrics.avgResolutionTime = (totalResolutionTime / resolvedIncidents.length) / (1000 * 60 * 60); // Convert to hours
  }

  incidents.forEach(incident => {
    if (incident.priority) {
      incidentMetrics.byPriority[incident.priority] = 
        (incidentMetrics.byPriority[incident.priority] || 0) + 1;
    }
    if (incident.incidentStatus) {
      incidentMetrics.byStatus[incident.incidentStatus] = 
        (incidentMetrics.byStatus[incident.incidentStatus] || 0) + 1;
    }
  });

  // Calculate analyst activity
  const analystActions = await prisma.auditLog.findMany({
    where: {
      resource: 'AUDIT_LOG',
      action: { in: ['UPDATE', 'CREATE', 'DELETE'] },
      createdAt: { gte: oneDayAgo },
    },
    select: {
      userId: true,
      createdAt: true,
    },
  });

  const analystActivity = {
    totalActions: analystActions.length,
    byAnalyst: {} as Record<number, number>,
    avgActionsPerDay: analystActions.length,
  };

  analystActions.forEach(action => {
    if (action.userId) {
      analystActivity.byAnalyst[action.userId] = 
        (analystActivity.byAnalyst[action.userId] || 0) + 1;
    }
  });

  // IP blocking metrics
  const ipBlockingMetrics = {
    totalBlocked: await prisma.blockedIP.count(),
    activeBlocks: blockedIPs.length,
    recentBlocks24h: blockedIPs.filter(ip => ip.blockedAt >= oneDayAgo).length,
  };

  // Trusted users metrics
  const now = new Date();
  const activeTrustedUsers = trustedUsers.filter(tu => 
    !tu.expiresAt || tu.expiresAt > now
  );

  const trustedUsersMetrics = {
    total: trustedUsers.length,
    active: activeTrustedUsers.length,
    byType: {
      userId: trustedUsers.filter(tu => tu.userId).length,
      ipAddress: trustedUsers.filter(tu => tu.ipAddress).length,
      email: trustedUsers.filter(tu => tu.email).length,
    },
  };

  return {
    securityEvents: securityEventsMetrics,
    incidents: incidentMetrics,
    analystActivity,
    ipBlocking: ipBlockingMetrics,
    trustedUsers: trustedUsersMetrics,
    performance: {
      avgQueryTime: 0, // Would need to track this separately
      slowQueries: 0,
    },
  };
}

/**
 * Log SOC analyst action with metrics
 */
export async function logSOCAction(
  analystId: number,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  logger.info({
    type: 'soc_action',
    analystId,
    action,
    details,
  }, `SOC Analyst ${analystId} performed action: ${action}`);
}

/**
 * Track incident resolution time
 */
export async function trackIncidentResolution(
  incidentId: number,
  resolvedBy: number,
  resolutionTime: number
): Promise<void> {
  logger.info({
    type: 'incident_resolved',
    incidentId,
    resolvedBy,
    resolutionTime,
  }, `Incident ${incidentId} resolved by analyst ${resolvedBy} in ${resolutionTime}ms`);
}
