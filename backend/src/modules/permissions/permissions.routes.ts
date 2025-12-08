import { Router } from 'express';
import { PermissionsController } from './permissions.controller';
import { authenticate } from '../../lib/auth/auth';
import { requireAdmin } from '../../lib/security/security';
import { validateRequest } from '../../lib/utils/validation';
import { z } from 'zod';

const router = Router();
const permissionsController = new PermissionsController();

// All routes require authentication
router.use(authenticate);

const createPermissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required'),
  description: z.string().optional(),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
});

const grantPermissionSchema = z.object({
  permissionId: z.number().int().positive('Permission ID must be a positive integer'),
});

const grantPagePermissionSchema = z.object({
  page: z.string().min(1, 'Page is required'),
  action: z.enum(['view', 'edit'], {
    errorMap: () => ({ message: 'Action must be "view" or "edit"' }),
  }),
});

// Public routes (authenticated users can view their own permissions)
router.get('/my-permissions', permissionsController.getMyPermissions.bind(permissionsController));
router.get('/my-page-permissions', permissionsController.getMyPagePermissions.bind(permissionsController));
router.get('/pages', permissionsController.getAllPagePermissions.bind(permissionsController));
router.get('/', permissionsController.getAllPermissions.bind(permissionsController));
router.get('/:id', permissionsController.getPermissionById.bind(permissionsController));

// Admin-only routes
router.post('/', requireAdmin, validateRequest(createPermissionSchema), permissionsController.createPermission.bind(permissionsController));
router.get('/users/:userId', requireAdmin, permissionsController.getUserPermissions.bind(permissionsController));
router.get('/users/:userId/page-permissions', requireAdmin, permissionsController.getUserPagePermissions.bind(permissionsController));
router.post('/users/:userId/grant', requireAdmin, validateRequest(grantPermissionSchema), permissionsController.grantPermission.bind(permissionsController));
router.post('/users/:userId/revoke', requireAdmin, validateRequest(grantPermissionSchema), permissionsController.revokePermission.bind(permissionsController));
router.post('/users/:userId/grant-page', requireAdmin, validateRequest(grantPagePermissionSchema), permissionsController.grantPagePermission.bind(permissionsController));
router.post('/users/:userId/revoke-page', requireAdmin, validateRequest(grantPagePermissionSchema), permissionsController.revokePagePermission.bind(permissionsController));
router.post('/roles/:roleId/grant-page', requireAdmin, validateRequest(grantPagePermissionSchema), permissionsController.grantPagePermissionToRole.bind(permissionsController));
router.get('/:permissionId/users', requireAdmin, permissionsController.getUsersWithPermission.bind(permissionsController));

export default router;
