import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../lib/errors';

export class RolesService {
    async getAll() {
        return prisma.role.findMany({
            include: {
                soldiers: {
                    select: {
                        id: true,
                    },
                },
                rolePermissions: {
                    where: { isActive: true },
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }

    async create(data: { name: string }) {
        return prisma.role.create({
            data: {
                name: data.name,
            },
            include: {
                rolePermissions: {
                    where: { isActive: true },
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }
    async getById(id: number) {
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    where: { isActive: true },
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!role) {
            throw new NotFoundError('Role');
        }
        return role;
    }

    async update(id: number, data: Partial<Role>) {
        await this.getById(id); // Check if exists
        return prisma.role.update({
            where: { id },
            data,
            include: {
                rolePermissions: {
                    where: { isActive: true },
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }

    async delete(id: number) {
        await this.getById(id); // Check if exists
        return prisma.role.delete({
            where: { id },
        });
    }

    /**
     * Get all permissions for a role
     */
    async getRolePermissions(roleId: number) {
        await this.getById(roleId); // Check if role exists
        
        const rolePermissions = await prisma.rolePermission.findMany({
            where: {
                roleId,
                isActive: true,
            },
            include: {
                permission: true,
            },
            orderBy: {
                permission: {
                    resource: 'asc',
                },
            },
        });

        return rolePermissions;
    }

    /**
     * Grant permission to role (Admin only)
     */
    async grantPermission(roleId: number, permissionId: number, grantedBy: number) {
        // Verify role exists
        await this.getById(roleId);

        // Verify permission exists
        const permission = await prisma.permission.findUnique({
            where: { id: permissionId },
        });

        if (!permission) {
            throw new NotFoundError('Permission');
        }

        // Check if permission already granted
        const existing = await prisma.rolePermission.findUnique({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId,
                },
            },
        });

        if (existing) {
            // If exists but inactive, activate it
            if (!existing.isActive) {
                return prisma.rolePermission.update({
                    where: { id: existing.id },
                    data: {
                        isActive: true,
                        grantedBy,
                        grantedAt: new Date(),
                    },
                    include: {
                        permission: true,
                        role: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                });
            }
            throw new ConflictError('Permission already granted to this role');
        }

        // Grant permission
        return prisma.rolePermission.create({
            data: {
                roleId,
                permissionId,
                grantedBy,
                isActive: true,
            },
            include: {
                permission: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Revoke permission from role (Admin only)
     */
    async revokePermission(roleId: number, permissionId: number) {
        await this.getById(roleId); // Check if role exists

        const rolePermission = await prisma.rolePermission.findUnique({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId,
                },
            },
        });

        if (!rolePermission) {
            throw new NotFoundError('Role permission');
        }

        // Deactivate instead of deleting (for audit trail)
        return prisma.rolePermission.update({
            where: { id: rolePermission.id },
            data: {
                isActive: false,
            },
            include: {
                permission: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
}
