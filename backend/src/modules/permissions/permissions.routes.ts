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
router.post('/roles/:roleId/revoke-page', requireAdmin, validateRequest(grantPagePermissionSchema), permissionsController.revokePagePermissionFromRole.bind(permissionsController));
router.get('/roles/:roleId/page-permissions', requireAdmin, permissionsController.getRolePagePermissions.bind(permissionsController));
router.get('/presets', requireAdmin, permissionsController.getPresets.bind(permissionsController));
router.post('/users/:userId/apply-preset', requireAdmin, validateRequest(z.object({
  presetId: z.string().min(1, 'Preset ID is required'),
})), permissionsController.applyPresetToUser.bind(permissionsController));
router.post('/roles/:roleId/apply-preset', requireAdmin, validateRequest(z.object({
  presetId: z.string().min(1, 'Preset ID is required'),
})), permissionsController.applyPresetToRole.bind(permissionsController));
router.post('/users/:userId/copy-from-user', requireAdmin, validateRequest(z.object({
  sourceUserId: z.number().int().positive('Source user ID must be a positive integer'),
})), permissionsController.copyPermissionsFromUser.bind(permissionsController));
router.post('/users/:userId/copy-from-role', requireAdmin, validateRequest(z.object({
  roleId: z.number().int().positive('Role ID must be a positive integer'),
})), permissionsController.copyPermissionsFromRoleToUser.bind(permissionsController));
router.post('/roles/:roleId/copy-from-role', requireAdmin, validateRequest(z.object({
  sourceRoleId: z.number().int().positive('Source role ID must be a positive integer'),
})), permissionsController.copyPermissionsFromRole.bind(permissionsController));
router.post('/users/:userId/bulk-grant-page', requireAdmin, validateRequest(z.object({
  permissions: z.array(z.object({
    page: z.string().min(1),
    action: z.enum(['view', 'edit']),
  })),
})), permissionsController.bulkGrantPagePermissionsToUser.bind(permissionsController));
router.post('/roles/:roleId/bulk-grant-page', requireAdmin, validateRequest(z.object({
  permissions: z.array(z.object({
    page: z.string().min(1),
    action: z.enum(['view', 'edit']),
  })),
})), permissionsController.bulkGrantPagePermissionsToRole.bind(permissionsController));
router.post('/users/:userId/grant-custom-mode', requireAdmin, validateRequest(z.object({
  page: z.string().min(1),
  modeId: z.string().min(1),
})), permissionsController.grantCustomModePermission.bind(permissionsController));
router.post('/users/:userId/revoke-custom-mode', requireAdmin, validateRequest(z.object({
  page: z.string().min(1),
  modeId: z.string().min(1),
})), permissionsController.revokeCustomModePermission.bind(permissionsController));
router.post('/roles/:roleId/grant-custom-mode', requireAdmin, validateRequest(z.object({
  page: z.string().min(1),
  modeId: z.string().min(1),
})), permissionsController.grantCustomModePermissionToRole.bind(permissionsController));
router.post('/roles/:roleId/revoke-custom-mode', requireAdmin, validateRequest(z.object({
  page: z.string().min(1),
  modeId: z.string().min(1),
})), permissionsController.revokeCustomModePermissionFromRole.bind(permissionsController));
router.get('/:permissionId/users', requireAdmin, permissionsController.getUsersWithPermission.bind(permissionsController));

export default router;
