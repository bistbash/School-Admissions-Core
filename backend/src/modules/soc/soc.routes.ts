import { Router } from 'express';
import { SOCController } from './soc.controller';
import { authenticate } from '../../lib/auth/auth';
import { requireAdmin } from '../../lib/security/security';
import { ForbiddenError } from '../../lib/utils/errors';

const router = Router();
const socController = new SOCController();

// All SOC routes require authentication
router.use(authenticate);

// Optional: Add role-based access control here
// For now, all authenticated users can access SOC endpoints
// In production, you might want to restrict to admins only

router.get('/audit-logs', socController.getAuditLogs.bind(socController));
router.get('/stats', socController.getStats.bind(socController));
router.get('/alerts', socController.getSecurityAlerts.bind(socController));
router.get('/incidents', socController.getOpenIncidents.bind(socController));
router.get('/users/:userId/activity', socController.getUserActivity.bind(socController));
router.get('/resources/:resource/:resourceId', socController.getResourceHistory.bind(socController));
router.put('/incidents/:id', socController.updateIncident.bind(socController));
router.post('/incidents/:id/mark', socController.markAsIncident.bind(socController));
router.get('/metrics', socController.getMetrics.bind(socController));
router.get('/export/logs', socController.exportAuditLogs.bind(socController));
router.get('/export/stats', socController.exportStats.bind(socController));
// IP blocking - admin only
router.get('/blocked-ips', requireAdmin, socController.getBlockedIPs.bind(socController));
router.post('/block-ip', requireAdmin, socController.blockIP.bind(socController));
router.post('/unblock-ip', requireAdmin, socController.unblockIP.bind(socController));

// Trusted users management - admin only
router.get('/trusted-users', requireAdmin, socController.getTrustedUsers.bind(socController));
router.post('/trusted-users', requireAdmin, socController.addTrustedUser.bind(socController));
router.delete('/trusted-users/:id', requireAdmin, socController.removeTrustedUser.bind(socController));

export default router;

