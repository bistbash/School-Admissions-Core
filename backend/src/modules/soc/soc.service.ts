import { prisma } from '../../lib/database/prisma';
import { AuditAction, AuditResource, AuditStatus } from '../../lib/audit/audit';
import { socCache, getAuditLogsCacheKey, getStatsCacheKey, invalidateSOCCache } from '../../lib/soc/soc-cache';
import { retryPrismaOperation } from '../../lib/database/prisma-retry';

export interface AuditLogFilter {
  userId?: number;
  userEmail?: string;
  action?: AuditAction | AuditAction[];
  resource?: AuditResource | AuditResource[];
  resourceId?: number;
  status?: AuditStatus | AuditStatus[];
  incidentStatus?: string | string[];
  priority?: string | string[];
  assignedTo?: number;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byStatus: Record<string, number>;
  byUser: Record<string, number>;
  recentFailures: number;
  recentUnauthorized: number;
  byIncidentStatus: Record<string, number>;
  byPriority: Record<string, number>;
  unassignedIncidents: number;
  openIncidents: number;
}

export interface IncidentUpdate {
  incidentStatus?: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: number;
  analystNotes?: string;
}

export class SOCService {
  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filter: AuditLogFilter = {}) {
    // Check cache first (only for read-only queries without pagination)
    if (!filter.limit || filter.limit <= 100) {
      const cacheKey = getAuditLogsCacheKey(filter);
      const cached = socCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.userEmail) {
      where.userEmail = { contains: filter.userEmail, mode: 'insensitive' };
    }

    if (filter.action) {
      if (Array.isArray(filter.action)) {
        where.action = { in: filter.action };
      } else {
        where.action = filter.action;
      }
    }

    if (filter.resource) {
      if (Array.isArray(filter.resource)) {
        where.resource = { in: filter.resource };
      } else {
        where.resource = filter.resource;
      }
    }

    if (filter.resourceId !== undefined) {
      where.resourceId = filter.resourceId;
    }

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status };
      } else {
        where.status = filter.status;
      }
    }

    if (filter.incidentStatus) {
      if (Array.isArray(filter.incidentStatus)) {
        where.incidentStatus = { in: filter.incidentStatus };
      } else {
        where.incidentStatus = filter.incidentStatus;
      }
    }

    if (filter.priority) {
      if (Array.isArray(filter.priority)) {
        where.priority = { in: filter.priority };
      } else {
        where.priority = filter.priority;
      }
    }

    if (filter.assignedTo !== undefined) {
      where.assignedTo = filter.assignedTo;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    if (filter.ipAddress) {
      where.ipAddress = { contains: filter.ipAddress };
    }

    const logs = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 100,
        skip: filter.offset || 0,
      })
    );

    const total = await retryPrismaOperation(() => prisma.auditLog.count({ where }));

    const result = {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      total,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
    };

    // Cache result if it's a small query
    if (!filter.limit || filter.limit <= 100) {
      const cacheKey = getAuditLogsCacheKey(filter);
      socCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes TTL
    }

    return result;
  }

  /**
   * Get audit log statistics
   * Uses database aggregations instead of loading all records into memory
   */
  async getAuditStats(filter: Omit<AuditLogFilter, 'limit' | 'offset'> = {}): Promise<AuditLogStats> {
    // Check cache
    const cacheKey = getStatsCacheKey(filter.startDate, filter.endDate);
    const cached = socCache.get<AuditLogStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Use database aggregations instead of loading all records
    // This is much more efficient, especially for large datasets
    const [
      totalLogs,
      actionGroups,
      resourceGroups,
      statusGroups,
      userGroups,
      recentFailuresCount,
      recentUnauthorizedCount,
      incidentStatusGroups,
      priorityGroups,
      unassignedIncidentsCount,
      openIncidentsCount,
    ] = await Promise.all([
      // Total count
      retryPrismaOperation(() => prisma.auditLog.count({ where })),
      
      // Group by action
      retryPrismaOperation(() => 
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true },
        })
      ),
      
      // Group by resource
      retryPrismaOperation(() =>
        prisma.auditLog.groupBy({
          by: ['resource'],
          where,
          _count: { resource: true },
        })
      ),
      
      // Group by status
      retryPrismaOperation(() =>
        prisma.auditLog.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        })
      ),
      
      // Group by user email
      retryPrismaOperation(() =>
        prisma.auditLog.groupBy({
          by: ['userEmail'],
          where,
          _count: { userEmail: true },
        })
      ),
      
      // Recent failures (last 24 hours)
      retryPrismaOperation(() =>
        prisma.auditLog.count({
          where: {
            ...where,
            status: 'FAILURE',
            createdAt: { gte: oneDayAgo },
          },
        })
      ),
      
      // Recent unauthorized access (last 24 hours)
      retryPrismaOperation(() =>
        prisma.auditLog.count({
          where: {
            ...where,
            action: { in: ['AUTH_FAILED', 'UNAUTHORIZED_ACCESS'] },
            createdAt: { gte: oneDayAgo },
          },
        })
      ),
      
      // Group by incident status
      retryPrismaOperation(() =>
        prisma.auditLog.groupBy({
          by: ['incidentStatus'],
          where: {
            ...where,
            incidentStatus: { not: null },
          },
          _count: { incidentStatus: true },
        })
      ),
      
      // Group by priority
      retryPrismaOperation(() =>
        prisma.auditLog.groupBy({
          by: ['priority'],
          where: {
            ...where,
            priority: { not: null },
          },
          _count: { priority: true },
        })
      ),
      
      // Unassigned incidents
      retryPrismaOperation(() =>
        prisma.auditLog.count({
          where: {
            ...where,
            incidentStatus: { in: ['NEW', 'INVESTIGATING', 'ESCALATED'] },
            assignedTo: null,
          },
        })
      ),
      
      // Open incidents
      retryPrismaOperation(() =>
        prisma.auditLog.count({
          where: {
            ...where,
            incidentStatus: { in: ['NEW', 'INVESTIGATING', 'ESCALATED'] },
          },
        })
      ),
    ]);

    // Build stats object from aggregated results
    const stats: AuditLogStats = {
      totalLogs,
      byAction: {},
      byResource: {},
      byStatus: {},
      byUser: {},
      recentFailures: recentFailuresCount,
      recentUnauthorized: recentUnauthorizedCount,
      byIncidentStatus: {},
      byPriority: {},
      unassignedIncidents: unassignedIncidentsCount,
      openIncidents: openIncidentsCount,
    };

    // Convert groupBy results to objects
    for (const group of actionGroups) {
      stats.byAction[group.action] = group._count.action;
    }

    for (const group of resourceGroups) {
      stats.byResource[group.resource] = group._count.resource;
    }

    for (const group of statusGroups) {
      stats.byStatus[group.status] = group._count.status;
    }

    for (const group of userGroups) {
      const user = group.userEmail || 'anonymous';
      stats.byUser[user] = group._count.userEmail;
    }

    for (const group of incidentStatusGroups) {
      if (group.incidentStatus) {
        stats.byIncidentStatus[group.incidentStatus] = group._count.incidentStatus;
      }
    }

    for (const group of priorityGroups) {
      if (group.priority) {
        stats.byPriority[group.priority] = group._count.priority;
      }
    }

    // Cache statistics for 5 minutes
    socCache.set(cacheKey, stats, 5 * 60 * 1000);

    return stats;
  }

  /**
   * Get security alerts (failed logins, unauthorized access, etc.)
   */
  async getSecurityAlerts(limit: number = 50) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const alerts = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: 'LOGIN_FAILED' },
            { action: 'AUTH_FAILED' },
            { action: 'UNAUTHORIZED_ACCESS' },
            { status: 'FAILURE' },
          ],
          createdAt: {
            gte: oneDayAgo,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    );

    return alerts.map(alert => ({
      ...alert,
      details: alert.details ? JSON.parse(alert.details) : null,
    }));
  }

  /**
   * Get open incidents (events that need attention)
   */
  async getOpenIncidents(limit: number = 100) {
    const incidents = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where: {
          incidentStatus: {
            in: ['NEW', 'INVESTIGATING', 'ESCALATED'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })
    );

    // Sort by priority manually (since priority can be null)
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const sorted = incidents.sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] || 0 : 0;
      const bPriority = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] || 0 : 0;
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted.map(incident => ({
      ...incident,
      details: incident.details ? JSON.parse(incident.details) : null,
    }));
  }

  /**
   * Update incident/event
   */
  async updateIncident(logId: number, update: IncidentUpdate, resolvedBy?: number) {
    const updateData: any = {
      ...update,
    };

    if (update.incidentStatus === 'RESOLVED' || update.incidentStatus === 'FALSE_POSITIVE') {
      updateData.resolvedAt = new Date();
      if (resolvedBy) {
        updateData.resolvedBy = resolvedBy;
      }
    }

    const updated = await retryPrismaOperation(() =>
      prisma.auditLog.update({
        where: { id: logId },
        data: updateData,
      })
    );

    // Invalidate cache when incidents are updated
    invalidateSOCCache();

    return {
      ...updated,
      details: updated.details ? JSON.parse(updated.details) : null,
    };
  }

  /**
   * Mark log as incident
   */
  async markAsIncident(logId: number, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', assignedTo?: number) {
    return this.updateIncident(logId, {
      incidentStatus: 'NEW',
      priority,
      assignedTo,
    });
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Get resource access history
   */
  async getResourceHistory(resource: AuditResource, resourceId: number) {
    const logs = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where: {
          resource,
          resourceId,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    );

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Get all blocked IPs (including expired ones for management)
   */
  async getBlockedIPs(includeExpired: boolean = true) {
    const where: any = {};
    if (!includeExpired) {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }
    return retryPrismaOperation(() =>
      prisma.blockedIP.findMany({
        where,
        orderBy: { blockedAt: 'desc' },
      })
    );
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, reason?: string, blockedBy?: number, expiresAt?: Date) {
    const { blockIP } = await import('../../lib/security/ipBlocking');
    return blockIP(ipAddress, reason, blockedBy, expiresAt);
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ipAddress: string) {
    const { unblockIP } = await import('../../lib/security/ipBlocking');
    return unblockIP(ipAddress);
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ipAddress: string) {
    const { isIPBlocked } = await import('../../lib/security/ipBlocking');
    return isIPBlocked(ipAddress);
  }

  /**
   * Get all trusted users
   */
  async getTrustedUsers() {
    const { getTrustedUsers } = await import('../../lib/security/trustedUsers');
    return getTrustedUsers();
  }

  /**
   * Add a trusted user/IP
   */
  async addTrustedUser(data: {
    userId?: number;
    ipAddress?: string;
    email?: string;
    name?: string;
    reason?: string;
    createdBy?: number;
    expiresAt?: Date;
  }) {
    const { addTrustedUser } = await import('../../lib/security/trustedUsers');
    return addTrustedUser(data);
  }

  /**
   * Remove a trusted user/IP
   */
  async removeTrustedUser(id: number) {
    const { removeTrustedUser } = await import('../../lib/security/trustedUsers');
    return removeTrustedUser(id);
  }
}
