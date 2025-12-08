import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/utils/errors';

export interface CreatePermissionData {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface GrantPermissionData {
  userId: number;
  permissionId: number;
}

export class PermissionsService {
  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: number) {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        userPermissions: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundError('Permission');
    }

    return permission;
  }

  /**
   * Create a new permission (Admin only)
   */
  async createPermission(data: CreatePermissionData) {
    // Check if permission already exists
    const existing = await prisma.permission.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError('Permission with this name already exists');
    }

    return prisma.permission.create({
      data: {
        name: data.name,
        description: data.description,
        resource: data.resource,
        action: data.action,
      },
    });
  }

  /**
   * Get all permissions for a user (including role permissions)
   */
  async getUserPermissions(userId: number) {
    // Get user with role
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      return [];
    }

    // Get direct user permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        permission: true,
      },
    });

    const permissions = new Map<number, typeof userPermissions[0]['permission']>();
    
    // Add direct user permissions
    userPermissions.forEach(up => {
      permissions.set(up.permission.id, up.permission);
    });

    // Add role permissions if user has a role
    if (user.roleId) {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: user.roleId,
          isActive: true,
        },
        include: {
          permission: true,
        },
      });

      rolePermissions.forEach(rp => {
        permissions.set(rp.permission.id, rp.permission);
      });
    }

    return Array.from(permissions.values());
  }

  /**
   * @deprecated Use hasScopedPermission from lib/permissions instead
   * This method is kept for backward compatibility but will be removed
   * Use: import { hasScopedPermission } from '../../lib/permissions/permissions';
   * hasScopedPermission(userId, permissionName)
   */
  async hasPermission(userId: number, permissionName: string): Promise<boolean> {
    const { hasScopedPermission } = await import('../../lib/permissions');
    return hasScopedPermission(userId, permissionName);
  }

  /**
   * @deprecated Use hasScopedPermission from lib/permissions instead
   * This method is kept for backward compatibility but will be removed
   * Use: import { hasScopedPermission } from '../../lib/permissions/permissions';
   * hasScopedPermission(userId, `${resource}:${action}`)
   */
  async hasResourcePermission(userId: number, resource: string, action: string): Promise<boolean> {
    const { hasScopedPermission } = await import('../../lib/permissions');
    return hasScopedPermission(userId, `${resource}:${action}`);
  }

  /**
   * Grant permission to user (Admin only)
   */
  async grantPermission(userId: number, permissionId: number, grantedBy: number) {
    // Verify user exists
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundError('Permission');
    }

    // Check if permission already granted
    const existing = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (existing) {
      // If exists but inactive, activate it
      if (!existing.isActive) {
        return prisma.userPermission.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            grantedBy,
            grantedAt: new Date(),
          },
          include: {
            permission: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }
      throw new ConflictError('Permission already granted to this user');
    }

    // Grant permission
    return prisma.userPermission.create({
      data: {
        userId,
        permissionId,
        grantedBy,
        isActive: true,
      },
      include: {
        permission: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Revoke permission from user (Admin only)
   */
  async revokePermission(userId: number, permissionId: number) {
    const userPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundError('User permission');
    }

    // Deactivate instead of deleting (for audit trail)
    return prisma.userPermission.update({
      where: { id: userPermission.id },
      data: {
        isActive: false,
      },
      include: {
        permission: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all users with a specific permission
   */
  async getUsersWithPermission(permissionId: number) {
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        permissionId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
          },
        },
      },
    });

    return userPermissions.map(up => up.user);
  }

  /**
   * Get all permissions for a user with details (including role permissions)
   */
  async getUserPermissionsWithDetails(userId: number) {
    // Get user with role
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    // Get direct user permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        permission: true,
      },
    });

    // Get role permissions if user has a role
    let rolePermissions: any[] = [];
    if (user?.roleId) {
      rolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: user.roleId,
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

    // Combine and format results
    const result = [
      ...userPermissions.map(up => ({
        id: up.id,
        userId: up.userId,
        permissionId: up.permissionId,
        permission: up.permission,
        grantedBy: up.grantedBy,
        grantedAt: up.grantedAt,
        isActive: up.isActive,
        source: 'user' as const,
      })),
      ...rolePermissions.map(rp => ({
        id: rp.id,
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        permission: rp.permission,
        role: rp.role,
        grantedBy: rp.grantedBy,
        grantedAt: rp.grantedAt,
        isActive: rp.isActive,
        source: 'role' as const,
      })),
    ];

    // Sort by resource
    result.sort((a, b) => {
      const resourceA = a.permission.resource.toLowerCase();
      const resourceB = b.permission.resource.toLowerCase();
      if (resourceA !== resourceB) {
        return resourceA.localeCompare(resourceB);
      }
      return a.permission.action.localeCompare(b.permission.action);
    });

    return result;
  }
}
