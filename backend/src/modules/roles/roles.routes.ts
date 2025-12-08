import { Router } from 'express';
import { RolesController } from './roles.controller';
import { validateRequest, roleSchema } from '../../lib/utils/validation';
import { authenticate } from '../../lib/auth/auth';
import { requireAdmin } from '../../lib/security/security';
import { z } from 'zod';

const router = Router();
const rolesController = new RolesController();

// All routes require authentication
router.use(authenticate);

const grantPermissionSchema = z.object({
  permissionId: z.number().int().positive('Permission ID must be a positive integer'),
});

router.get('/', rolesController.getAll.bind(rolesController));
router.get('/:id', rolesController.getById.bind(rolesController));
router.post('/', requireAdmin, validateRequest(roleSchema), rolesController.create.bind(rolesController));
router.put('/:id', requireAdmin, validateRequest(roleSchema.partial()), rolesController.update.bind(rolesController));
router.delete('/:id', requireAdmin, rolesController.delete.bind(rolesController));

// Role permissions routes
router.get('/:id/permissions', rolesController.getRolePermissions.bind(rolesController));
router.post('/:id/permissions/grant', requireAdmin, validateRequest(grantPermissionSchema), rolesController.grantPermission.bind(rolesController));
router.post('/:id/permissions/revoke', requireAdmin, validateRequest(grantPermissionSchema), rolesController.revokePermission.bind(rolesController));

export default router;
