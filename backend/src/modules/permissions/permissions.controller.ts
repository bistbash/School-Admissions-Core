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
}
