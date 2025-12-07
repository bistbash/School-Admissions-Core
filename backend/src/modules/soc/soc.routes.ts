import { Router } from 'express';
import { SOCController } from './soc.controller';
import { authenticate } from '../../lib/auth';
import { ForbiddenError } from '../../lib/errors';

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
router.get('/blocked-ips', socController.getBlockedIPs.bind(socController));
router.post('/block-ip', socController.blockIP.bind(socController));
router.post('/unblock-ip', socController.unblockIP.bind(socController));

export default router;

