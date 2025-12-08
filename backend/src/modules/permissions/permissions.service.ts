import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/utils/errors';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage, isPageAdminOnly } from '../../lib/permissions/permission-registry';

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
   * Admins automatically have all permissions
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

    // Admins have all permissions - return all permissions in the system
    if ((user as any).isAdmin) {
      return prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' },
        ],
      });
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
   * Only approved users can receive permissions
   */
  async grantPermission(userId: number, permissionId: number, grantedBy: number) {
    // Check if user is approved - only approved users can receive permissions
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { approvalStatus: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.approvalStatus !== 'APPROVED') {
      throw new ValidationError(`Cannot grant permissions to user with status "${user.approvalStatus}". Only APPROVED users can receive permissions.`);
    }
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
   * Admins automatically have all permissions
   */
  async getUserPermissionsWithDetails(userId: number) {
    // Get user with role
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { roleId: true, isAdmin: true },
    });

    // Admins have all permissions - return all permissions as if granted directly
    if ((user as any).isAdmin) {
      const allPermissions = await prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' },
        ],
      });

      return allPermissions.map(perm => ({
        id: 0, // Virtual ID for admin permissions
        userId,
        permissionId: perm.id,
        permission: perm,
        grantedBy: null,
        grantedAt: new Date(),
        isActive: true,
        source: 'admin' as const,
      }));
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

    // Combine and format results (only if not admin - admins already returned above)
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

  /**
   * Get or create a permission by resource and action
   */
  async getOrCreatePermission(resource: string, action: string, description?: string) {
    const name = `${resource}:${action}`;
    
    let permission = await prisma.permission.findUnique({
      where: { name },
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          name,
          resource,
          action,
          description: description || `Permission to ${action} ${resource}`,
        },
      });
    }

    return permission;
  }

  /**
   * Grant page permission to user (automatically grants API permissions)
   * Note: Admins don't need explicit permissions - they have all permissions automatically
   * Only approved users can receive permissions
   */
  async grantPagePermission(
    userId: number,
    page: string,
    action: 'view' | 'edit',
    grantedBy: number
  ) {
    // Check if user is approved - only approved users can receive permissions
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true, approvalStatus: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.approvalStatus !== 'APPROVED') {
      throw new ValidationError(`Cannot grant permissions to user with status "${user.approvalStatus}". Only APPROVED users can receive permissions.`);
    }

    if (user?.isAdmin) {
      // Admins already have all permissions, but we can still grant them for consistency
      // This ensures the permission exists in the database even for admins
    }

    // Check if page exists
    const pagePermission = PAGE_PERMISSIONS[page];
    if (!pagePermission) {
      throw new NotFoundError(`Page "${page}" not found`);
    }

    // Check if admin-only and user is not admin
    if (action === 'edit' && isPageAdminOnly(page)) {
      if (!user?.isAdmin) {
        throw new ValidationError(`Only admins can edit page "${page}"`);
      }
    }

    // Get or create page permission
    const pagePermissionName = `page:${page}:${action}`;
    const pagePerm = await this.getOrCreatePermission(
      'page',
      `${page}:${action}`,
      `${action === 'view' ? 'View' : 'Edit'} ${pagePermission.displayName} page`
    );

    // Grant page permission
    await this.grantPermission(userId, pagePerm.id, grantedBy);

    // Get all API permissions for this page and action
    const apiPermissions = getAPIPermissionsForPage(page, action);

    // Grant all API permissions
    for (const apiPerm of apiPermissions) {
      const permission = await this.getOrCreatePermission(
        apiPerm.resource,
        apiPerm.action,
        apiPerm.description
      );
      await this.grantPermission(userId, permission.id, grantedBy);
    }

    return {
      pagePermission: pagePerm,
      apiPermissions: apiPermissions.length,
    };
  }

  /**
   * Revoke page permission from user (automatically revokes API permissions)
   */
  async revokePagePermission(userId: number, page: string, action: 'view' | 'edit') {
    // Get page permission
    const pagePermissionName = `page:${page}:${action}`;
    const pagePerm = await prisma.permission.findUnique({
      where: { name: pagePermissionName },
    });

    if (!pagePerm) {
      throw new NotFoundError(`Page permission "${pagePermissionName}" not found`);
    }

    // Revoke page permission
    await this.revokePermission(userId, pagePerm.id);

    // Get all API permissions for this page and action
    const apiPermissions = getAPIPermissionsForPage(page, action);

    // Revoke all API permissions
    for (const apiPerm of apiPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: `${apiPerm.resource}:${apiPerm.action}` },
      });
      if (permission) {
        await this.revokePermission(userId, permission.id);
      }
    }

    return {
      pagePermission: pagePerm,
      apiPermissions: apiPermissions.length,
    };
  }

  /**
   * Get all page permissions
   */
  getAllPagePermissions() {
    return Object.values(PAGE_PERMISSIONS);
  }

  /**
   * Get user's page permissions
   */
  async getUserPagePermissions(userId: number) {
    // Check if user is admin - admins have all permissions
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      // Admins have all permissions - return all pages with view and edit
      const pagePermissions: Record<string, { view: boolean; edit: boolean }> = {};
      Object.keys(PAGE_PERMISSIONS).forEach(page => {
        pagePermissions[page] = { view: true, edit: true };
      });
      return pagePermissions;
    }

    const userPermissions = await this.getUserPermissionsWithDetails(userId);
    
    const pagePermissions: Record<string, { view: boolean; edit: boolean }> = {};
    
    // Initialize all pages
    Object.keys(PAGE_PERMISSIONS).forEach(page => {
      pagePermissions[page] = { view: false, edit: false };
    });

    // Check user permissions
    userPermissions.forEach(up => {
      const perm = up.permission;
      if (perm.resource === 'page') {
        const match = perm.action.match(/^(.+):(view|edit)$/);
        if (match) {
          const [, page, action] = match;
          if (pagePermissions[page]) {
            pagePermissions[page][action as 'view' | 'edit'] = true;
          }
        }
      }
    });

    return pagePermissions;
  }

  /**
   * Grant page permission to role (automatically grants API permissions)
   */
  async grantPagePermissionToRole(
    roleId: number,
    page: string,
    action: 'view' | 'edit',
    grantedBy: number
  ) {
    // Check if page exists
    const pagePermission = PAGE_PERMISSIONS[page];
    if (!pagePermission) {
      throw new NotFoundError(`Page "${page}" not found`);
    }

    // Get or create page permission
    const pagePerm = await this.getOrCreatePermission(
      'page',
      `${page}:${action}`,
      `${action === 'view' ? 'View' : 'Edit'} ${pagePermission.displayName} page`
    );

    // Grant page permission to role
    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: pagePerm.id,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.rolePermission.update({
          where: { id: existing.id },
          data: { isActive: true, grantedBy, grantedAt: new Date() },
        });
      }
    } else {
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId: pagePerm.id,
          grantedBy,
          isActive: true,
        },
      });
    }

    // Get all API permissions for this page and action
    const apiPermissions = getAPIPermissionsForPage(page, action);

    // Grant all API permissions to role
    for (const apiPerm of apiPermissions) {
      const permission = await this.getOrCreatePermission(
        apiPerm.resource,
        apiPerm.action,
        apiPerm.description
      );
      
      const existingRolePerm = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
      });

      if (!existingRolePerm) {
        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: permission.id,
            grantedBy,
            isActive: true,
          },
        });
      } else if (!existingRolePerm.isActive) {
        await prisma.rolePermission.update({
          where: { id: existingRolePerm.id },
          data: { isActive: true, grantedBy, grantedAt: new Date() },
        });
      }
    }

    return {
      pagePermission: pagePerm,
      apiPermissions: apiPermissions.length,
    };
  }
}
