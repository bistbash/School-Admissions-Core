import { prisma } from '../../lib/prisma';
import { AuditAction, AuditResource, AuditStatus } from '../../lib/audit';

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

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      total,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
    };
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(filter: Omit<AuditLogFilter, 'limit' | 'offset'> = {}): Promise<AuditLogStats> {
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

    const allLogs = await prisma.auditLog.findMany({
      where,
      select: {
        action: true,
        resource: true,
        status: true,
        userEmail: true,
        createdAt: true,
        incidentStatus: true,
        priority: true,
        assignedTo: true,
      },
    });

    const stats: AuditLogStats = {
      totalLogs: allLogs.length,
      byAction: {},
      byResource: {},
      byStatus: {},
      byUser: {},
      recentFailures: 0,
      recentUnauthorized: 0,
      byIncidentStatus: {},
      byPriority: {},
      unassignedIncidents: 0,
      openIncidents: 0,
    };

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    for (const log of allLogs) {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by resource
      stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;

      // Count by status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;

      // Count by user
      const user = log.userEmail || 'anonymous';
      stats.byUser[user] = (stats.byUser[user] || 0) + 1;

      // Count recent failures
      if (log.status === 'FAILURE' && log.createdAt >= oneDayAgo) {
        stats.recentFailures++;
      }

      // Count recent unauthorized access
      if (log.action === 'AUTH_FAILED' || log.action === 'UNAUTHORIZED_ACCESS') {
        if (log.createdAt >= oneDayAgo) {
          stats.recentUnauthorized++;
        }
      }

      // Count by incident status
      if (log.incidentStatus) {
        stats.byIncidentStatus[log.incidentStatus] = (stats.byIncidentStatus[log.incidentStatus] || 0) + 1;
      }

      // Count by priority
      if (log.priority) {
        stats.byPriority[log.priority] = (stats.byPriority[log.priority] || 0) + 1;
      }

      // Count unassigned incidents
      if (log.incidentStatus && log.incidentStatus !== 'RESOLVED' && log.incidentStatus !== 'FALSE_POSITIVE' && !log.assignedTo) {
        stats.unassignedIncidents++;
      }

      // Count open incidents
      if (log.incidentStatus && log.incidentStatus !== 'RESOLVED' && log.incidentStatus !== 'FALSE_POSITIVE') {
        stats.openIncidents++;
      }
    }

    return stats;
  }

  /**
   * Get security alerts (failed logins, unauthorized access, etc.)
   */
  async getSecurityAlerts(limit: number = 50) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const alerts = await prisma.auditLog.findMany({
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
    });

    return alerts.map(alert => ({
      ...alert,
      details: alert.details ? JSON.parse(alert.details) : null,
    }));
  }

  /**
   * Get open incidents (events that need attention)
   */
  async getOpenIncidents(limit: number = 100) {
    const incidents = await prisma.auditLog.findMany({
      where: {
        incidentStatus: {
          in: ['NEW', 'INVESTIGATING', 'ESCALATED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

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

    const updated = await prisma.auditLog.update({
      where: { id: logId },
      data: updateData,
    });

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

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Get resource access history
   */
  async getResourceHistory(resource: AuditResource, resourceId: number) {
    const logs = await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Get all blocked IPs
   */
  async getBlockedIPs() {
    return prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { blockedAt: 'desc' },
    });
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, reason?: string, blockedBy?: number, expiresAt?: Date) {
    const { blockIP } = await import('../../lib/ipBlocking');
    return blockIP(ipAddress, reason, blockedBy, expiresAt);
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ipAddress: string) {
    const { unblockIP } = await import('../../lib/ipBlocking');
    return unblockIP(ipAddress);
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ipAddress: string) {
    const { isIPBlocked } = await import('../../lib/ipBlocking');
    return isIPBlocked(ipAddress);
  }
}
