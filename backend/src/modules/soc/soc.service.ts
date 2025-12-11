import { prisma } from '../../lib/database/prisma';
import { AuditAction, AuditResource, AuditStatus } from '../../lib/audit/audit';
import { socCache, getAuditLogsCacheKey, getStatsCacheKey, invalidateSOCCache } from '../../lib/soc/soc-cache';
import { retryPrismaOperation } from '../../lib/database/prisma-retry';
import { emitAuditLogUpdate, emitIncidentUpdate } from '../../lib/soc/soc-websocket';
import { logger } from '../../lib/utils/logger';

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
  apiKeyId?: number; // Filter by API key ID
  apiKeyOwnerId?: number; // Filter by API key owner (user who created the API key)
  authMethod?: 'API_KEY' | 'JWT' | 'UNAUTHENTICATED'; // Filter by authentication method
  correlationId?: string; // Filter by correlation ID
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

    // Build where clause step by step - use AND array from the start to avoid conflicts
    const whereConditions: any[] = [];
    const directWhere: any = {};

    if (filter.userId) {
      directWhere.userId = filter.userId;
    }

    if (filter.userEmail) {
      // SQLite doesn't support case-insensitive mode
      directWhere.userEmail = { contains: filter.userEmail };
    }

    if (filter.action) {
      if (Array.isArray(filter.action)) {
        directWhere.action = { in: filter.action };
      } else {
        directWhere.action = filter.action;
      }
    }

    if (filter.resource) {
      if (Array.isArray(filter.resource)) {
        directWhere.resource = { in: filter.resource };
      } else {
        directWhere.resource = filter.resource;
      }
    }

    if (filter.resourceId !== undefined) {
      directWhere.resourceId = filter.resourceId;
    }

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        directWhere.status = { in: filter.status };
      } else {
        directWhere.status = filter.status;
      }
    }

    if (filter.incidentStatus) {
      if (Array.isArray(filter.incidentStatus)) {
        directWhere.incidentStatus = { in: filter.incidentStatus };
      } else {
        directWhere.incidentStatus = filter.incidentStatus;
      }
    }

    if (filter.priority) {
      if (Array.isArray(filter.priority)) {
        directWhere.priority = { in: filter.priority };
      } else {
        directWhere.priority = filter.priority;
      }
    }

    if (filter.assignedTo !== undefined) {
      directWhere.assignedTo = filter.assignedTo;
    }

    if (filter.startDate || filter.endDate) {
      directWhere.createdAt = {};
      if (filter.startDate) {
        directWhere.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        directWhere.createdAt.lte = filter.endDate;
      }
    }

    if (filter.ipAddress) {
      directWhere.ipAddress = { contains: filter.ipAddress };
    }

    if (filter.apiKeyId) {
      directWhere.apiKeyId = filter.apiKeyId;
    }

    // Complex conditions that need AND array
    if (filter.apiKeyOwnerId) {
      // Filter by API key owner - need to join with ApiKey table
      whereConditions.push({
        apiKey: {
          userId: filter.apiKeyOwnerId,
        },
      });
    }

    if (filter.authMethod) {
      // Filter by authentication method
      if (filter.authMethod === 'API_KEY') {
        if (!filter.apiKeyId) {
          // Only set if apiKeyId filter is not already specified
          whereConditions.push({ apiKeyId: { not: null } });
        }
      } else if (filter.authMethod === 'JWT') {
        // JWT: has userId but no apiKeyId
        whereConditions.push({ apiKeyId: null });
        whereConditions.push({ userId: { not: null } });
      } else if (filter.authMethod === 'UNAUTHENTICATED') {
        // UNAUTHENTICATED: no userId and no apiKeyId
        whereConditions.push({ apiKeyId: null });
        whereConditions.push({ userId: null });
      }
    }

    if (filter.correlationId) {
      // Filter by correlation ID in details JSON
      // details is a String field containing JSON, so we use contains for string search
      whereConditions.push({
        details: {
          contains: `"correlationId":"${filter.correlationId}"`,
        },
      });
    }

    // Default to showing more logs if no limit specified (for SOC visibility)
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;
    
    // Build final where clause - combine direct conditions with AND array
    let finalWhere: any = { ...directWhere };
    
    // Add AND conditions if we have any
    if (whereConditions.length > 0) {
      finalWhere.AND = whereConditions;
    }
    
    // If no conditions at all, use empty object (Prisma will return all records)
    if (Object.keys(finalWhere).length === 0) {
      finalWhere = {};
    }
    
    try {
      // Log the exact where clause before query
      console.log('[DEBUG] Final where clause:', JSON.stringify(finalWhere, null, 2));
      console.log('[DEBUG] Direct where:', JSON.stringify(directWhere, null, 2));
      console.log('[DEBUG] Where conditions:', JSON.stringify(whereConditions, null, 2));
      console.log('[DEBUG] Filter:', JSON.stringify(filter, null, 2));
      
      try {
        logger.debug({
          where: JSON.stringify(finalWhere),
          limit,
          offset,
          filter: JSON.stringify(filter),
        }, 'Fetching audit logs');
      } catch (logError) {
        // Fallback if logger fails - just continue
      }
      
      // Validate where clause structure before query
      if (finalWhere.AND && Array.isArray(finalWhere.AND)) {
        // Check for conflicts: if directWhere has apiKeyId and AND has apiKey condition
        if (directWhere.apiKeyId && finalWhere.AND.some((cond: any) => cond.apiKey)) {
          console.error('[ERROR] Conflict detected: directWhere.apiKeyId and AND.apiKey both exist!');
          throw new Error('Invalid where clause: cannot have both apiKeyId and apiKey conditions');
        }
        // Check for conflicts: if directWhere has details and AND has details condition
        if (directWhere.details && finalWhere.AND.some((cond: any) => cond.details)) {
          console.error('[ERROR] Conflict detected: directWhere.details and AND.details both exist!');
          throw new Error('Invalid where clause: cannot have both directWhere.details and AND.details conditions');
        }
      }
      
                    const logs = await retryPrismaOperation(() =>
                        prisma.auditLog.findMany({
                            where: finalWhere as any,
                            orderBy: [
                                { isPinned: 'desc' }, // Pinned logs first
                                { pinnedAt: 'desc' }, // Among pinned, newest pinned first
                                { createdAt: 'desc' }, // Then by creation date
                            ],
                            take: limit,
                            skip: offset,
                            include: {
                                // Include API key info if available
                                apiKey: true,
                            },
                        } as any)
                    );

      const total = await retryPrismaOperation(() => prisma.auditLog.count({ where: finalWhere as any }));

      // Enrich logs with user information for API keys
      const enrichedLogs = await Promise.all(
        logs.map(async (log: any) => {
          // Get API key owner (the user who created/owns the API key)
          let apiKeyOwner = null;
          const apiKey = log.apiKey as any;
          if (apiKey?.userId) {
            apiKeyOwner = await retryPrismaOperation(() =>
              prisma.soldier.findUnique({
                where: { id: apiKey.userId },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  personalNumber: true,
                  isAdmin: true,
                },
              })
            );
          }

          // Get user info if userId exists (the user who made the request)
          let userInfo = null;
          if (log.userId) {
            userInfo = await retryPrismaOperation(() =>
              prisma.soldier.findUnique({
                where: { id: log.userId },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  personalNumber: true,
                  isAdmin: true,
                },
              })
            );
          }

          // Parse details to get auth method - handle errors gracefully
          let details = null;
          try {
            details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null;
          } catch (error) {
            // If parsing fails, use empty object
            details = {};
          }
          
          const authMethod = details?.authMethod || (log.apiKeyId ? 'API_KEY' : (log.userId ? 'JWT' : 'UNAUTHENTICATED'));

          return {
            ...log,
            details,
            authMethod, // How the request was authenticated: API_KEY, JWT, or UNAUTHENTICATED
            apiKey: apiKey ? {
              id: apiKey.id,
              name: apiKey.name,
              owner: apiKeyOwner, // The user who owns/created this API key
              userId: apiKey.userId || undefined, // Owner's user ID
            } : null,
            user: userInfo, // The user who made the request (if authenticated)
          };
        })
      );

      const result = {
        logs: enrichedLogs,
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
    } catch (error: any) {
      // Log the error with full details for debugging
      console.error('[ERROR] getAuditLogs failed:', {
        error: error?.message || String(error),
        stack: error?.stack,
        where: JSON.stringify(finalWhere, null, 2),
        directWhere: JSON.stringify(directWhere, null, 2),
        whereConditions: JSON.stringify(whereConditions, null, 2),
        filter: JSON.stringify(filter, null, 2),
      });
      
      try {
        logger.error({
          error: error?.message || String(error),
          stack: error?.stack,
          where: JSON.stringify(finalWhere),
          filter: JSON.stringify(filter),
        }, 'Error in getAuditLogs');
      } catch (logError) {
        // Already logged to console above
      }
      
      // Re-throw to be handled by controller
      throw error;
    }
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

    // Emit real-time update via WebSocket
    emitIncidentUpdate({
      ...updated,
      details: updated.details ? JSON.parse(updated.details) : null,
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

  /**
   * Bulk mark incidents as false positive
   * Useful for cleaning up incidents created by anomaly detection that were false positives
   */
  async bulkMarkAsFalsePositive(incidentIds: number[], resolvedBy?: number) {
    const updated = await retryPrismaOperation(() =>
      prisma.auditLog.updateMany({
        where: {
          id: { in: incidentIds },
          incidentStatus: { in: ['NEW', 'INVESTIGATING'] }
        },
        data: {
          incidentStatus: 'FALSE_POSITIVE',
          resolvedAt: new Date(),
          resolvedBy: resolvedBy || null,
        }
      })
    );

    // Invalidate cache
    invalidateSOCCache();

    return { count: updated.count };
  }

  /**
   * Clean up old false positive incidents
   * Marks incidents older than specified days as false positive if they match certain criteria
   */
  async cleanupOldFalsePositives(daysOld: number = 7, resolvedBy?: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find incidents that:
    // 1. Are older than cutoff date
    // 2. Are still marked as NEW or INVESTIGATING
    // 3. Were created by anomaly detection (have anomalyDetected in details)
    // 4. Are unauthenticated (no userId, no apiKeyId)
    const oldIncidents = await retryPrismaOperation(() =>
      prisma.auditLog.findMany({
        where: {
          incidentStatus: { in: ['NEW', 'INVESTIGATING'] },
          createdAt: { lt: cutoffDate },
          userId: null,
          apiKeyId: null,
          details: {
            contains: 'anomalyDetected'
          }
        },
        select: { id: true }
      })
    );

    if (oldIncidents.length === 0) {
      return { count: 0 };
    }

    const incidentIds = oldIncidents.map(i => i.id);
    return this.bulkMarkAsFalsePositive(incidentIds, resolvedBy);
  }
}
