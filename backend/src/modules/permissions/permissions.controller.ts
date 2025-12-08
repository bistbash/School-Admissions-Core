import { Request, Response, NextFunction } from 'express';
import { PermissionsService } from './permissions.service';
import { auditFromRequest } from '../../lib/audit/audit';

const permissionsService = new PermissionsService();

export class PermissionsController {
  /**
   * Get all permissions
   */
  async getAllPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await permissionsService.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const permission = await permissionsService.getPermissionById(id);
      res.json(permission);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new permission (Admin only)
   */
  async createPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const permission = await permissionsService.createPermission(req.body);
      
      await auditFromRequest(req, 'CREATE', 'PERMISSION', {
        status: 'SUCCESS',
        resourceId: permission.id,
        details: {
          permissionName: permission.name,
          createdBy: adminUser.userId,
        },
      });

      res.status(201).json(permission);
    } catch (error) {
      await auditFromRequest(req, 'CREATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to create permission',
      });
      next(error);
    }
  }

  /**
   * Get all permissions for current user
   */
  async getMyPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const permissions = await permissionsService.getUserPermissionsWithDetails(user.userId);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all permissions for a specific user
   */
  async getUserPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId);
      const permissions = await permissionsService.getUserPermissionsWithDetails(userId);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grant permission to user (Admin only)
   */
  async grantPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { permissionId } = req.body;

      if (!permissionId) {
        return res.status(400).json({ error: 'Permission ID is required' });
      }

      const userPermission = await permissionsService.grantPermission(
        userId,
        permissionId,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        resourceId: userPermission.id,
        details: {
          action: 'grant_permission',
          userId,
          permissionId,
          grantedBy: adminUser.userId,
        },
      });

      res.json(userPermission);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to grant permission',
        details: {
          action: 'grant_permission',
          userId: req.params.userId,
        },
      });
      next(error);
    }
  }

  /**
   * Revoke permission from user (Admin only)
   */
  async revokePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { permissionId } = req.body;

      if (!permissionId) {
        return res.status(400).json({ error: 'Permission ID is required' });
      }

      const userPermission = await permissionsService.revokePermission(userId, permissionId);

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        resourceId: userPermission.id,
        details: {
          action: 'revoke_permission',
          userId,
          permissionId,
          revokedBy: adminUser.userId,
        },
      });

      res.json(userPermission);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to revoke permission',
        details: {
          action: 'revoke_permission',
          userId: req.params.userId,
        },
      });
      next(error);
    }
  }

  /**
   * Get all users with a specific permission
   */
  async getUsersWithPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const permissionId = parseInt(req.params.permissionId);
      const users = await permissionsService.getUsersWithPermission(permissionId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all page permissions (registry)
   */
  async getAllPagePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const pages = permissionsService.getAllPagePermissions();
      res.json(pages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's page permissions
   */
  async getUserPagePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId);
      const pagePermissions = await permissionsService.getUserPagePermissions(userId);
      res.json(pagePermissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my page permissions
   */
  async getMyPagePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const pagePermissions = await permissionsService.getUserPagePermissions(user.userId);
      res.json(pagePermissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grant page permission to user (Admin only)
   * Prevents admin from editing their own permissions
   */
  async grantPagePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { page, action } = req.body;

      if (!page || !action) {
        return res.status(400).json({ error: 'Page and action are required' });
      }

      if (!['view', 'edit'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "view" or "edit"' });
      }

      // Prevent admin from editing their own permissions
      if (adminUser.userId === userId) {
        return res.status(403).json({ error: 'Cannot edit your own permissions' });
      }

      const result = await permissionsService.grantPagePermission(
        userId,
        page,
        action,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        resourceId: result.pagePermission.id,
        details: {
          action: 'grant_page_permission',
          userId,
          page,
          permissionAction: action,
          grantedBy: adminUser.userId,
          apiPermissionsGranted: result.apiPermissions,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to grant page permission',
        details: {
          action: 'grant_page_permission',
          userId: req.params.userId,
        },
      });
      next(error);
    }
  }

  /**
   * Revoke page permission from user (Admin only)
   * Prevents admin from editing their own permissions
   */
  async revokePagePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { page, action } = req.body;

      if (!page || !action) {
        return res.status(400).json({ error: 'Page and action are required' });
      }

      if (!['view', 'edit'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "view" or "edit"' });
      }

      // Prevent admin from editing their own permissions
      if (adminUser.userId === userId) {
        return res.status(403).json({ error: 'Cannot edit your own permissions' });
      }

      const result = await permissionsService.revokePagePermission(userId, page, action);

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        resourceId: result.pagePermission.id,
        details: {
          action: 'revoke_page_permission',
          userId,
          page,
          permissionAction: action,
          revokedBy: adminUser.userId,
          apiPermissionsRevoked: result.apiPermissions,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to revoke page permission',
        details: {
          action: 'revoke_page_permission',
          userId: req.params.userId,
        },
      });
      next(error);
    }
  }

  /**
   * Grant page permission to role (Admin only)
   */
  async grantPagePermissionToRole(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const roleId = parseInt(req.params.roleId);
      const { page, action } = req.body;

      if (!page || !action) {
        return res.status(400).json({ error: 'Page and action are required' });
      }

      if (!['view', 'edit'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "view" or "edit"' });
      }

      const result = await permissionsService.grantPagePermissionToRole(
        roleId,
        page,
        action,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'grant_page_permission_to_role',
          roleId,
          page,
          permissionAction: action,
          grantedBy: adminUser.userId,
          apiPermissionsGranted: result.apiPermissions,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to grant page permission to role',
        details: {
          action: 'grant_page_permission_to_role',
          roleId: req.params.roleId,
        },
      });
      next(error);
    }
  }

  /**
   * Revoke page permission from role (Admin only)
   */
  async revokePagePermissionFromRole(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const roleId = parseInt(req.params.roleId);
      const { page, action } = req.body;

      if (!page || !action) {
        return res.status(400).json({ error: 'Page and action are required' });
      }

      if (!['view', 'edit'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "view" or "edit"' });
      }

      const result = await permissionsService.revokePagePermissionFromRole(roleId, page, action);

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'revoke_page_permission_from_role',
          roleId,
          page,
          permissionAction: action,
          revokedBy: adminUser.userId,
          apiPermissionsRevoked: result.apiPermissions,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to revoke page permission from role',
        details: {
          action: 'revoke_page_permission_from_role',
          roleId: req.params.roleId,
        },
      });
      next(error);
    }
  }

  /**
   * Get role's page permissions (Admin only)
   */
  async getRolePagePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = parseInt(req.params.roleId);
      const pagePermissions = await permissionsService.getRolePagePermissions(roleId);
      res.json(pagePermissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk grant page permissions to user (Admin only)
   */
  async bulkGrantPagePermissionsToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Permissions must be an array' });
      }

      const results = await permissionsService.bulkGrantPagePermissionsToUser(
        userId,
        permissions,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'bulk_grant_page_permissions_to_user',
          userId,
          permissionsCount: permissions.length,
          grantedBy: adminUser.userId,
        },
      });

      res.json(results);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to bulk grant page permissions',
        details: {
          action: 'bulk_grant_page_permissions_to_user',
          userId: req.params.userId,
        },
      });
      next(error);
    }
  }

  /**
   * Bulk grant page permissions to role (Admin only)
   */
  async bulkGrantPagePermissionsToRole(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const roleId = parseInt(req.params.roleId);
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Permissions must be an array' });
      }

      const results = await permissionsService.bulkGrantPagePermissionsToRole(
        roleId,
        permissions,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'bulk_grant_page_permissions_to_role',
          roleId,
          permissionsCount: permissions.length,
          grantedBy: adminUser.userId,
        },
      });

      res.json(results);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to bulk grant page permissions to role',
        details: {
          action: 'bulk_grant_page_permissions_to_role',
          roleId: req.params.roleId,
        },
      });
      next(error);
    }
  }

  /**
   * Grant custom view mode permission to user (Admin only)
   */
  async grantCustomModePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { page, modeId } = req.body;

      if (!page || !modeId) {
        return res.status(400).json({ error: 'Page and modeId are required' });
      }

      // Prevent admin from editing their own permissions
      if (adminUser.userId === userId) {
        return res.status(403).json({ error: 'Cannot edit your own permissions' });
      }

      const result = await permissionsService.grantCustomModePermission(
        userId,
        page,
        modeId,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'grant_custom_mode_permission',
          userId,
          page,
          modeId,
          grantedBy: adminUser.userId,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to grant custom mode permission',
      });
      next(error);
    }
  }

  /**
   * Revoke custom view mode permission from user (Admin only)
   */
  async revokeCustomModePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const userId = parseInt(req.params.userId);
      const { page, modeId } = req.body;

      if (!page || !modeId) {
        return res.status(400).json({ error: 'Page and modeId are required' });
      }

      // Prevent admin from editing their own permissions
      if (adminUser.userId === userId) {
        return res.status(403).json({ error: 'Cannot edit your own permissions' });
      }

      const result = await permissionsService.revokeCustomModePermission(userId, page, modeId);

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'revoke_custom_mode_permission',
          userId,
          page,
          modeId,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to revoke custom mode permission',
      });
      next(error);
    }
  }

  /**
   * Grant custom view mode permission to role (Admin only)
   */
  async grantCustomModePermissionToRole(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const roleId = parseInt(req.params.roleId);
      const { page, modeId } = req.body;

      if (!page || !modeId) {
        return res.status(400).json({ error: 'Page and modeId are required' });
      }

      const result = await permissionsService.grantCustomModePermissionToRole(
        roleId,
        page,
        modeId,
        adminUser.userId
      );

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'grant_custom_mode_permission_to_role',
          roleId,
          page,
          modeId,
          grantedBy: adminUser.userId,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to grant custom mode permission to role',
      });
      next(error);
    }
  }

  /**
   * Revoke custom view mode permission from role (Admin only)
   */
  async revokeCustomModePermissionFromRole(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = (req as any).user;
      const roleId = parseInt(req.params.roleId);
      const { page, modeId } = req.body;

      if (!page || !modeId) {
        return res.status(400).json({ error: 'Page and modeId are required' });
      }

      const result = await permissionsService.revokeCustomModePermissionFromRole(roleId, page, modeId);

      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'SUCCESS',
        details: {
          action: 'revoke_custom_mode_permission_from_role',
          roleId,
          page,
          modeId,
        },
      });

      res.json(result);
    } catch (error) {
      await auditFromRequest(req, 'UPDATE', 'PERMISSION', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Failed to revoke custom mode permission from role',
      });
      next(error);
    }
  }
}
