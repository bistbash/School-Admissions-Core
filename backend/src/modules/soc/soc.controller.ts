import { Request, Response, NextFunction } from 'express';
import { SOCService, AuditLogFilter, IncidentUpdate } from './soc.service';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { auditFromRequest } from '../../lib/audit';

const socService = new SOCService();

export class SOCController {
  /**
   * Get audit logs with filtering
   * GET /api/soc/audit-logs
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: AuditLogFilter = {
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        userEmail: req.query.userEmail as string | undefined,
        action: req.query.action as any,
        resource: req.query.resource as any,
        resourceId: req.query.resourceId ? Number(req.query.resourceId) : undefined,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ipAddress: req.query.ipAddress as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof AuditLogFilter] === undefined) {
          delete filter[key as keyof AuditLogFilter];
        }
      });

      const result = await socService.getAuditLogs(filter);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit statistics
   * GET /api/soc/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: Omit<AuditLogFilter, 'limit' | 'offset'> = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof typeof filter] === undefined) {
          delete filter[key as keyof typeof filter];
        }
      });

      const stats = await socService.getAuditStats(filter);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security alerts
   * GET /api/soc/alerts
   */
  async getSecurityAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const alerts = await socService.getSecurityAlerts(limit);
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity
   * GET /api/soc/users/:userId/activity
   */
  async getUserActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.userId);
      const days = req.query.days ? Number(req.query.days) : 30;
      const activity = await socService.getUserActivity(userId, days);
      res.json(activity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get resource history
   * GET /api/soc/resources/:resource/:resourceId
   */
  async getResourceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const resource = req.params.resource as any;
      const resourceId = Number(req.params.resourceId);
      const history = await socService.getResourceHistory(resource, resourceId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get open incidents
   * GET /api/soc/incidents
   */
  async getOpenIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const incidents = await socService.getOpenIncidents(limit);
      res.json(incidents);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update incident
   * PUT /api/soc/incidents/:id
   */
  async updateIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const logId = Number(req.params.id);
      const user = (req as any).user;
      const update: IncidentUpdate = req.body;
      
      const updated = await socService.updateIncident(logId, update, user?.userId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark log as incident
   * POST /api/soc/incidents/:id/mark
   */
  async markAsIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const logId = Number(req.params.id);
      const { priority, assignedTo } = req.body;
      
      if (!priority || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
        return res.status(400).json({ error: 'Priority is required and must be LOW, MEDIUM, HIGH, or CRITICAL' });
      }

      const updated = await socService.markAsIncident(logId, priority, assignedTo);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get blocked IPs
   * GET /api/soc/blocked-ips
   */
  async getBlockedIPs(req: Request, res: Response, next: NextFunction) {
    try {
      const blockedIPs = await socService.getBlockedIPs();
      res.json(blockedIPs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block an IP address
   * POST /api/soc/block-ip
   */
  async blockIP(req: Request, res: Response, next: NextFunction) {
    try {
      const { ipAddress, reason, expiresAt } = req.body;
      const user = (req as any).user;

      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }

      const expiresDate = expiresAt ? new Date(expiresAt) : undefined;
      const blocked = await socService.blockIP(ipAddress, reason, user?.userId, expiresDate);
      res.json(blocked);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblock an IP address
   * POST /api/soc/unblock-ip
   */
  async unblockIP(req: Request, res: Response, next: NextFunction) {
    try {
      const { ipAddress } = req.body;

      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }

      await socService.unblockIP(ipAddress);
      res.json({ message: 'IP address unblocked successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all trusted users/IPs
   * GET /api/soc/trusted-users
   */
  async getTrustedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const trustedUsers = await socService.getTrustedUsers();
      res.json(trustedUsers);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a trusted user/IP
   * POST /api/soc/trusted-users
   */
  async addTrustedUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, ipAddress, email, name, reason, expiresAt } = req.body;
      const user = (req as any).user;
      const createdBy = user?.userId;

      if (!userId && !ipAddress && !email) {
        return res.status(400).json({ 
          error: 'At least one of userId, ipAddress, or email is required' 
        });
      }

      const trustedUser = await socService.addTrustedUser({
        userId,
        ipAddress,
        email,
        name,
        reason: reason || 'Added by admin',
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      // Log the action
      await auditFromRequest(req, 'CREATE', 'TRUSTED_USER', {
        status: 'SUCCESS',
        resourceId: trustedUser.id,
        details: {
          userId,
          ipAddress,
          email,
          name,
          reason,
        },
      }).catch(console.error);

      res.status(201).json(trustedUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a trusted user/IP
   * DELETE /api/soc/trusted-users/:id
   */
  async removeTrustedUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid trusted user ID' });
      }

      await socService.removeTrustedUser(id);

      // Log the action
      await auditFromRequest(req, 'DELETE', 'TRUSTED_USER', {
        status: 'SUCCESS',
        resourceId: id,
      }).catch(console.error);

      res.json({ message: 'Trusted user/IP removed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

