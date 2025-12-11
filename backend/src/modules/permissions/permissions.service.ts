import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/utils/errors';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage } from '../../lib/permissions/permission-registry';
import { PERMISSION_PRESETS, getPreset } from '../../lib/permissions/permission-presets';

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
    userPermissions.forEach((up: any) => {
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

      rolePermissions.forEach((rp: any) => {
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
    const { hasScopedPermission } = await import('../../lib/permissions/permissions');
    return hasScopedPermission(userId, permissionName);
  }

  /**
   * @deprecated Use hasScopedPermission from lib/permissions instead
   * This method is kept for backward compatibility but will be removed
   * Use: import { hasScopedPermission } from '../../lib/permissions/permissions';
   * hasScopedPermission(userId, `${resource}:${action}`)
   */
  async hasResourcePermission(userId: number, resource: string, action: string): Promise<boolean> {
    const { hasScopedPermission } = await import('../../lib/permissions/permissions');
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
      select: { approvalStatus: true, id: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.approvalStatus !== 'APPROVED') {
      throw new ValidationError(`Cannot grant permissions to user with status "${user.approvalStatus}". Only APPROVED users can receive permissions.`);
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
      // Permission already exists and is active - return it (idempotent)
      return prisma.userPermission.findUnique({
        where: { id: existing.id },
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
   * Idempotent: if permission doesn't exist or is already inactive, returns success
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

    // If permission doesn't exist or is already inactive, return success (idempotent)
    if (!userPermission || !userPermission.isActive) {
      // Return a mock response for consistency
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });
      return {
        id: userPermission?.id || 0,
        userId,
        permissionId,
        permission: permission || null,
        isActive: false,
        user: null,
      };
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

    return userPermissions.map((up: any) => up.user);
  }

  /**
   * Get all permissions for a user with details (including role permissions)
   * Admins automatically have all permissions
   */
  async getUserPermissionsWithDetails(userId: number) {
    // Get user with role
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { roleId: true, isAdmin: true, id: true },
    });

    // Admins have all permissions - return all permissions as if granted directly
    if ((user as any).isAdmin) {
      const allPermissions = await prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' },
        ],
      });

      return allPermissions.map((perm: any) => ({
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
      select: { isAdmin: true, approvalStatus: true, id: true },
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

    // Check if page supports edit mode when trying to grant edit permission
    if (action === 'edit' && pagePermission.supportsEditMode === false) {
      throw new ValidationError(
        `Page "${pagePermission.displayNameHebrew || pagePermission.displayName}" does not support edit mode. Only view permission can be granted.`
      );
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
   * Idempotent: if permission doesn't exist, returns success
   * Note: Only revokes direct user permissions, not permissions from roles
   */
  async revokePagePermission(userId: number, page: string, action: 'view' | 'edit') {
    // Get page permission
    const pagePermissionName = `page:${page}:${action}`;
    const pagePerm = await prisma.permission.findUnique({
      where: { name: pagePermissionName },
    });

    // If permission type doesn't exist in system, nothing to revoke
    if (!pagePerm) {
      return {
        pagePermission: null,
        apiPermissions: 0,
        message: 'Permission type not found in system',
      };
    }

    // Get user to check role
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { roleId: true, id: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if user has this permission directly (not through role)
    const userPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: pagePerm.id,
        },
      },
    });

    // Check if user has this permission directly
    if (userPermission && userPermission.isActive) {
      // User has direct permission - can revoke it
      // But first check: if trying to revoke 'view' but user also has 'edit', view is included in edit
      if (action === 'view') {
        const editPermissionName = `page:${page}:edit`;
        const editPerm = await prisma.permission.findUnique({
          where: { name: editPermissionName },
        });
        
        if (editPerm) {
          const userEditPermission = await prisma.userPermission.findUnique({
            where: {
              userId_permissionId: {
                userId,
                permissionId: editPerm.id,
              },
            },
          });
          
          // If user has edit permission directly, view is included - cannot revoke view separately
          if (userEditPermission && userEditPermission.isActive) {
            throw new ValidationError(
              `Cannot revoke "view" permission - user has "edit" permission which includes view. Revoke "edit" instead to remove both.`
            );
          }
        }
      }
      
      // User has direct permission and it's not blocked by edit - proceed with revocation
      // (continue to actual revocation below)
    } else {
      // User doesn't have direct permission - check if it comes from role or edit
      // Special case: if trying to revoke 'view' but user has 'edit', view is included in edit
      if (action === 'view') {
        const editPermissionName = `page:${page}:edit`;
        const editPerm = await prisma.permission.findUnique({
          where: { name: editPermissionName },
        });
        
        if (editPerm) {
          // Check if user has edit permission directly
          const userEditPermission = await prisma.userPermission.findUnique({
            where: {
              userId_permissionId: {
                userId,
                permissionId: editPerm.id,
              },
            },
          });
          
          // If user has edit permission directly, view is included - cannot revoke view separately
          if (userEditPermission && userEditPermission.isActive) {
            throw new ValidationError(
              `Cannot revoke "view" permission - user has "edit" permission which includes view. Revoke "edit" instead to remove both.`
            );
          }
          
          // Check if user has edit permission through role
          if (user.roleId) {
            const roleEditPermission = await prisma.rolePermission.findUnique({
              where: {
                roleId_permissionId: {
                  roleId: user.roleId,
                  permissionId: editPerm.id,
                },
              },
            });
            
            if (roleEditPermission && roleEditPermission.isActive) {
              throw new ValidationError(
                `Cannot revoke "view" permission - user has "edit" permission (through role) which includes view. Revoke "edit" from the role instead.`
              );
            }
          }
        }
      }
      
      // Check if permission comes from role
      if (user.roleId) {
        const rolePermission = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: user.roleId,
              permissionId: pagePerm.id,
            },
          },
        });

        if (rolePermission && rolePermission.isActive) {
          // Permission comes from role - cannot revoke directly
          throw new ValidationError(
            `Cannot revoke permission "${pagePermissionName}" - it is granted through the user's role. Remove it from the role instead.`
          );
        }
      }

      // Permission doesn't exist (not from user, not from role, not from edit) - return success (idempotent)
      return {
        pagePermission: pagePerm,
        apiPermissions: 0,
        message: 'Permission was not granted directly to this user',
      };
    }

    // Revoke page permission
    await this.revokePermission(userId, pagePerm.id);

    // Get all API permissions for this page and action
    const apiPermissions = getAPIPermissionsForPage(page, action);

    // Revoke all API permissions (only if they exist and are active)
    let revokedCount = 0;
    for (const apiPerm of apiPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: `${apiPerm.resource}:${apiPerm.action}` },
      });
      if (permission) {
        const userApiPerm = await prisma.userPermission.findUnique({
          where: {
            userId_permissionId: {
              userId,
              permissionId: permission.id,
            },
          },
        });
        if (userApiPerm && userApiPerm.isActive) {
          await this.revokePermission(userId, permission.id);
          revokedCount++;
        }
      }
    }

    return {
      pagePermission: pagePerm,
      apiPermissions: revokedCount,
    };
  }

  /**
   * Get all page permissions
   */
  getAllPagePermissions() {
    return Object.values(PAGE_PERMISSIONS);
  }

  /**
   * Get user's page permissions (including custom view modes)
   */
  async getUserPagePermissions(userId: number) {
    // Check if user is admin - admins have all permissions
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true, id: true },
    });

    if (user?.isAdmin) {
      // Admins have all permissions - return all pages with view and edit
      // Maintain consistent object shape with non-admin users for frontend compatibility
      const pagePermissions: Record<string, { 
        view: boolean; 
        edit: boolean; 
        customModes?: string[];
        viewFromRole?: boolean;
        editFromRole?: boolean;
      }> = {};
      Object.keys(PAGE_PERMISSIONS).forEach(page => {
        pagePermissions[page] = { 
          view: true, 
          edit: true, 
          customModes: [], 
          viewFromRole: false, 
          editFromRole: false 
        };
      });
      return pagePermissions;
    }

    const userPermissions = await this.getUserPermissionsWithDetails(userId);
    
    const pagePermissions: Record<string, { 
      view: boolean; 
      edit: boolean; 
      customModes?: string[];
      viewFromRole?: boolean;
      editFromRole?: boolean;
    }> = {};
    
    // Initialize all pages
    Object.keys(PAGE_PERMISSIONS).forEach(page => {
      pagePermissions[page] = { view: false, edit: false, customModes: [], viewFromRole: false, editFromRole: false };
    });

    // Check user permissions - track both direct view and edit permissions, and their source
    userPermissions.forEach((up: any) => {
      const perm = up.permission;
      const source = up.source || 'user'; // 'user' for direct, 'role' for role-based
      
      if (perm.resource === 'page') {
        // Check for standard view/edit permissions: page:pageName:view or page:pageName:edit
        const standardMatch = perm.action.match(/^(.+):(view|edit)$/);
        if (standardMatch) {
          const [, page, action] = standardMatch;
          if (pagePermissions[page]) {
            // Set the specific permission (view or edit)
            pagePermissions[page][action as 'view' | 'edit'] = true;
            // Track if permission comes from role
            if (source === 'role') {
              pagePermissions[page][action === 'view' ? 'viewFromRole' : 'editFromRole'] = true;
            }
            // Note: edit includes view, but we track them separately
            // If user has edit, view will be true in the UI, but we know it comes from edit
          }
        } else {
          // Check for custom mode permissions: page:pageName:mode:modeId
          const customMatch = perm.action.match(/^(.+):mode:(.+)$/);
          if (customMatch) {
            const [, page, modeId] = customMatch;
            if (pagePermissions[page] && pagePermissions[page].customModes) {
              if (!pagePermissions[page].customModes!.includes(modeId)) {
                pagePermissions[page].customModes!.push(modeId);
              }
            }
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

    // Check if page supports edit mode when trying to grant edit permission
    if (action === 'edit' && pagePermission.supportsEditMode === false) {
      throw new ValidationError(
        `Page "${pagePermission.displayNameHebrew || pagePermission.displayName}" does not support edit mode. Only view permission can be granted.`
      );
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

  /**
   * Grant custom view mode permission to user
   */
  async grantCustomModePermission(
    userId: number,
    page: string,
    modeId: string,
    grantedBy: number
  ) {
    // Check if user is approved
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true, approvalStatus: true, id: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.approvalStatus !== 'APPROVED') {
      throw new ValidationError(`Cannot grant permissions to user with status "${user.approvalStatus}". Only APPROVED users can receive permissions.`);
    }

    // Check if page exists
    const pagePermission = PAGE_PERMISSIONS[page];
    if (!pagePermission) {
      throw new NotFoundError(`Page "${page}" not found`);
    }

    // Check if custom mode exists for this page
    const customMode = pagePermission.customModes?.find(m => m.id === modeId);
    if (!customMode) {
      throw new NotFoundError(`Custom mode "${modeId}" not found for page "${page}"`);
    }

    // Get or create custom mode permission
    const modePermissionName = `page:${page}:mode:${modeId}`;
    const modePerm = await this.getOrCreatePermission(
      'page',
      `${page}:mode:${modeId}`,
      `Custom view mode "${customMode.nameHebrew}" for ${pagePermission.displayNameHebrew}`
    );

    // Grant custom mode permission
    await this.grantPermission(userId, modePerm.id, grantedBy);

    // Grant API permissions for this custom mode (if specified)
    const apiPermissions = customMode.viewAPIs || customMode.editAPIs || [];
    for (const apiPerm of apiPermissions) {
      const permission = await this.getOrCreatePermission(
        apiPerm.resource,
        apiPerm.action,
        apiPerm.description
      );
      await this.grantPermission(userId, permission.id, grantedBy);
    }

    return {
      modePermission: modePerm,
      apiPermissions: apiPermissions.length,
    };
  }

  /**
   * Revoke custom view mode permission from user
   * Idempotent: if permission doesn't exist, returns success
   */
  async revokeCustomModePermission(userId: number, page: string, modeId: string) {
    const modePermissionName = `page:${page}:mode:${modeId}`;
    const modePerm = await prisma.permission.findUnique({
      where: { name: modePermissionName },
    });

    // If permission type doesn't exist, nothing to revoke
    if (!modePerm) {
      return {
        modePermission: null,
        message: 'Custom mode permission type not found',
      };
    }

    // Check if user actually has this permission
    const userPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: modePerm.id,
        },
      },
    });

    // If user doesn't have this permission, return success (idempotent)
    if (!userPermission || !userPermission.isActive) {
      return {
        modePermission: modePerm,
        message: 'Custom mode permission was not granted to this user',
      };
    }

    await this.revokePermission(userId, modePerm.id);

    // Revoke associated API permissions
    const pagePermission = PAGE_PERMISSIONS[page];
    const customMode = pagePermission?.customModes?.find(m => m.id === modeId);
    if (customMode) {
      const apiPermissions = customMode.viewAPIs || customMode.editAPIs || [];
      for (const apiPerm of apiPermissions) {
        const permission = await prisma.permission.findUnique({
          where: { name: `${apiPerm.resource}:${apiPerm.action}` },
        });
        if (permission) {
          await this.revokePermission(userId, permission.id);
        }
      }
    }

    return {
      modePermission: modePerm,
    };
  }

  /**
   * Grant custom view mode permission to role
   */
  async grantCustomModePermissionToRole(
    roleId: number,
    page: string,
    modeId: string,
    grantedBy: number
  ) {
    // Check if page exists
    const pagePermission = PAGE_PERMISSIONS[page];
    if (!pagePermission) {
      throw new NotFoundError(`Page "${page}" not found`);
    }

    // Check if custom mode exists
    const customMode = pagePermission.customModes?.find(m => m.id === modeId);
    if (!customMode) {
      throw new NotFoundError(`Custom mode "${modeId}" not found for page "${page}"`);
    }

    // Get or create custom mode permission
    const modePermissionName = `page:${page}:mode:${modeId}`;
    const modePerm = await this.getOrCreatePermission(
      'page',
      `${page}:mode:${modeId}`,
      `Custom view mode "${customMode.nameHebrew}" for ${pagePermission.displayNameHebrew}`
    );

    // Grant to role
    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: modePerm.id,
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
          permissionId: modePerm.id,
          grantedBy,
          isActive: true,
        },
      });
    }

    // Grant API permissions
    const apiPermissions = customMode.viewAPIs || customMode.editAPIs || [];
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
      modePermission: modePerm,
      apiPermissions: apiPermissions.length,
    };
  }

  /**
   * Revoke custom view mode permission from role
   * Idempotent: if permission doesn't exist, returns success
   */
  async revokeCustomModePermissionFromRole(roleId: number, page: string, modeId: string) {
    const modePermissionName = `page:${page}:mode:${modeId}`;
    const modePerm = await prisma.permission.findUnique({
      where: { name: modePermissionName },
    });

    // If permission type doesn't exist, nothing to revoke
    if (!modePerm) {
      return {
        modePermission: null,
        message: 'Custom mode permission type not found',
      };
    }

    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: modePerm.id,
        },
      },
    });

    // If role doesn't have this permission, return success (idempotent)
    if (!rolePermission || !rolePermission.isActive) {
      return {
        modePermission: modePerm,
        message: 'Custom mode permission was not granted to this role',
      };
    }

    await prisma.rolePermission.update({
      where: { id: rolePermission.id },
      data: { isActive: false },
    });

    return {
      modePermission: modePerm,
    };
  }

  /**
   * Revoke page permission from role (automatically revokes API permissions)
   * Idempotent: if permission doesn't exist, returns success
   */
  async revokePagePermissionFromRole(roleId: number, page: string, action: 'view' | 'edit') {
    // Get page permission
    const pagePermissionName = `page:${page}:${action}`;
    const pagePerm = await prisma.permission.findUnique({
      where: { name: pagePermissionName },
    });

    // If permission type doesn't exist in system, nothing to revoke
    if (!pagePerm) {
      return {
        pagePermission: null,
        apiPermissions: 0,
        message: 'Permission type not found in system',
      };
    }

    // Check if role actually has this permission
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: pagePerm.id,
        },
      },
    });

    // If role doesn't have this permission, return success (idempotent)
    if (!rolePermission || !rolePermission.isActive) {
      return {
        pagePermission: pagePerm,
        apiPermissions: 0,
        message: 'Permission was not granted to this role',
      };
    }

    // Revoke page permission from role
    await prisma.rolePermission.update({
      where: { id: rolePermission.id },
      data: { isActive: false },
    });

    // Get all API permissions for this page and action
    const apiPermissions = getAPIPermissionsForPage(page, action);

    // Revoke all API permissions from role (only if they exist and are active)
    let revokedCount = 0;
    for (const apiPerm of apiPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: `${apiPerm.resource}:${apiPerm.action}` },
      });
      if (permission) {
        const rolePerm = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permission.id,
            },
          },
        });
        if (rolePerm && rolePerm.isActive) {
          await prisma.rolePermission.update({
            where: { id: rolePerm.id },
            data: { isActive: false },
          });
          revokedCount++;
        }
      }
    }

    return {
      pagePermission: pagePerm,
      apiPermissions: revokedCount,
    };
  }

  /**
   * Get role's page permissions (including custom view modes)
   */
  async getRolePagePermissions(roleId: number) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    // Get all role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId,
        isActive: true,
      },
      include: {
        permission: true,
      },
    });

    const pagePermissions: Record<string, { view: boolean; edit: boolean; customModes?: string[] }> = {};

    // Initialize all pages
    Object.keys(PAGE_PERMISSIONS).forEach(page => {
      pagePermissions[page] = { view: false, edit: false, customModes: [] };
    });

    // Check role permissions
    rolePermissions.forEach((rp: any) => {
      const perm = rp.permission;
      if (perm.resource === 'page') {
        // Check for standard view/edit permissions
        const standardMatch = perm.action.match(/^(.+):(view|edit)$/);
        if (standardMatch) {
          const [, page, action] = standardMatch;
          if (pagePermissions[page]) {
            pagePermissions[page][action as 'view' | 'edit'] = true;
          }
        } else {
          // Check for custom mode permissions
          const customMatch = perm.action.match(/^(.+):mode:(.+)$/);
          if (customMatch) {
            const [, page, modeId] = customMatch;
            if (pagePermissions[page] && pagePermissions[page].customModes) {
              if (!pagePermissions[page].customModes!.includes(modeId)) {
                pagePermissions[page].customModes!.push(modeId);
              }
            }
          }
        }
      }
    });

    return pagePermissions;
  }

  /**
   * Bulk grant page permissions to user
   */
  async bulkGrantPagePermissionsToUser(
    userId: number,
    permissions: Array<{ page: string; action: 'view' | 'edit' }>,
    grantedBy: number
  ) {
    const results = [];
    for (const perm of permissions) {
      try {
        const result = await this.grantPagePermission(userId, perm.page, perm.action, grantedBy);
        results.push({ ...perm, success: true, result });
      } catch (error) {
        results.push({ ...perm, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }

  /**
   * Bulk grant page permissions to role
   */
  async bulkGrantPagePermissionsToRole(
    roleId: number,
    permissions: Array<{ page: string; action: 'view' | 'edit' }>,
    grantedBy: number
  ) {
    const results = [];
    for (const perm of permissions) {
      try {
        const result = await this.grantPagePermissionToRole(roleId, perm.page, perm.action, grantedBy);
        results.push({ ...perm, success: true, result });
      } catch (error) {
        results.push({ ...perm, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }

  /**
   * Apply permission preset to user
   */
  async applyPresetToUser(userId: number, presetId: string, grantedBy: number) {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new NotFoundError(`Preset "${presetId}" not found`);
    }

    return this.bulkGrantPagePermissionsToUser(userId, preset.permissions, grantedBy);
  }

  /**
   * Apply permission preset to role
   */
  async applyPresetToRole(roleId: number, presetId: string, grantedBy: number) {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new NotFoundError(`Preset "${presetId}" not found`);
    }

    return this.bulkGrantPagePermissionsToRole(roleId, preset.permissions, grantedBy);
  }

  /**
   * Copy permissions from one user to another
   */
  async copyPermissionsFromUser(sourceUserId: number, targetUserId: number, grantedBy: number) {
    const sourcePermissions = await this.getUserPagePermissions(sourceUserId);
    
    const permissions: Array<{ page: string; action: 'view' | 'edit' }> = [];
    
    for (const [page, perms] of Object.entries(sourcePermissions)) {
      if (perms.view) {
        permissions.push({ page, action: 'view' });
      }
      if (perms.edit) {
        permissions.push({ page, action: 'edit' });
      }
    }

    return this.bulkGrantPagePermissionsToUser(targetUserId, permissions, grantedBy);
  }

  /**
   * Copy permissions from role to user
   */
  async copyPermissionsFromRoleToUser(roleId: number, userId: number, grantedBy: number) {
    const rolePermissions = await this.getRolePagePermissions(roleId);
    
    const permissions: Array<{ page: string; action: 'view' | 'edit' }> = [];
    
    for (const [page, perms] of Object.entries(rolePermissions)) {
      if (perms.view) {
        permissions.push({ page, action: 'view' });
      }
      if (perms.edit) {
        permissions.push({ page, action: 'edit' });
      }
    }

    return this.bulkGrantPagePermissionsToUser(userId, permissions, grantedBy);
  }

  /**
   * Copy permissions from one role to another
   */
  async copyPermissionsFromRole(sourceRoleId: number, targetRoleId: number, grantedBy: number) {
    const sourcePermissions = await this.getRolePagePermissions(sourceRoleId);
    
    const permissions: Array<{ page: string; action: 'view' | 'edit' }> = [];
    
    for (const [page, perms] of Object.entries(sourcePermissions)) {
      if (perms.view) {
        permissions.push({ page, action: 'view' });
      }
      if (perms.edit) {
        permissions.push({ page, action: 'edit' });
      }
    }

    return this.bulkGrantPagePermissionsToRole(targetRoleId, permissions, grantedBy);
  }
}
