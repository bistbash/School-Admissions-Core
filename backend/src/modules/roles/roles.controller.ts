import { Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service';
import { auditFromRequest } from '../../lib/audit';

const rolesService = new RolesService();

export class RolesController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const roles = await rolesService.getAll();
            res.json(roles);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const role = await rolesService.getById(Number(req.params.id));
            res.json(role);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = (req as any).user;
            const role = await rolesService.create(req.body);
            
            await auditFromRequest(req, 'CREATE', 'ROLE', {
                status: 'SUCCESS',
                resourceId: role.id,
                details: {
                    roleName: role.name,
                    createdBy: adminUser.userId,
                },
            });

            res.status(201).json(role);
        } catch (error) {
            await auditFromRequest(req, 'CREATE', 'ROLE', {
                status: 'FAILURE',
                errorMessage: error instanceof Error ? error.message : 'Failed to create role',
            });
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = (req as any).user;
            const roleId = Number(req.params.id);
            const role = await rolesService.update(roleId, req.body);
            
            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'SUCCESS',
                resourceId: role.id,
                details: {
                    roleName: role.name,
                    updatedBy: adminUser.userId,
                },
            });

            res.json(role);
        } catch (error) {
            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'FAILURE',
                errorMessage: error instanceof Error ? error.message : 'Failed to update role',
                details: {
                    roleId: req.params.id,
                },
            });
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = (req as any).user;
            const roleId = Number(req.params.id);
            
            // Get role info before deletion for audit
            const role = await rolesService.getById(roleId);
            await rolesService.delete(roleId);
            
            await auditFromRequest(req, 'DELETE', 'ROLE', {
                status: 'SUCCESS',
                resourceId: roleId,
                details: {
                    roleName: role.name,
                    deletedBy: adminUser.userId,
                },
            });

            res.json({ message: 'Role deleted successfully' });
        } catch (error) {
            await auditFromRequest(req, 'DELETE', 'ROLE', {
                status: 'FAILURE',
                errorMessage: error instanceof Error ? error.message : 'Failed to delete role',
                details: {
                    roleId: req.params.id,
                },
            });
            next(error);
        }
    }

    async getRolePermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const roleId = Number(req.params.id);
            const permissions = await rolesService.getRolePermissions(roleId);
            res.json(permissions);
        } catch (error) {
            next(error);
        }
    }

    async grantPermission(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = (req as any).user;
            const roleId = Number(req.params.id);
            const { permissionId } = req.body;

            if (!permissionId) {
                return res.status(400).json({ error: 'Permission ID is required' });
            }

            const rolePermission = await rolesService.grantPermission(
                roleId,
                permissionId,
                adminUser.userId
            );

            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'SUCCESS',
                resourceId: rolePermission.id,
                details: {
                    action: 'grant_permission',
                    roleId,
                    permissionId,
                    grantedBy: adminUser.userId,
                },
            });

            res.json(rolePermission);
        } catch (error) {
            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'FAILURE',
                errorMessage: error instanceof Error ? error.message : 'Failed to grant permission',
                details: {
                    action: 'grant_permission',
                    roleId: req.params.id,
                },
            });
            next(error);
        }
    }

    async revokePermission(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = (req as any).user;
            const roleId = Number(req.params.id);
            const { permissionId } = req.body;

            if (!permissionId) {
                return res.status(400).json({ error: 'Permission ID is required' });
            }

            const rolePermission = await rolesService.revokePermission(roleId, permissionId);

            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'SUCCESS',
                resourceId: rolePermission.id,
                details: {
                    action: 'revoke_permission',
                    roleId,
                    permissionId,
                    revokedBy: adminUser.userId,
                },
            });

            res.json(rolePermission);
        } catch (error) {
            await auditFromRequest(req, 'UPDATE', 'ROLE', {
                status: 'FAILURE',
                errorMessage: error instanceof Error ? error.message : 'Failed to revoke permission',
                details: {
                    action: 'revoke_permission',
                    roleId: req.params.id,
                },
            });
            next(error);
        }
    }
}
