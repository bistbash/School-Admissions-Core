import { prisma } from '../database/prisma';
import { UnauthorizedError, ValidationError } from '../utils/errors';

/**
 * Advanced Permission System
 * Supports:
 * - Scoped permissions (resource:action:scope)
 * - Permission policies (dynamic rules)
 * - Context-aware permission checks
 */

export interface PermissionScope {
  type: 'department' | 'role' | 'user' | 'all';
  value?: number | string; // departmentId, roleId, userId, or 'all'
}

export interface PermissionContext {
  userId: number;
  departmentId?: number | null;
  roleId?: number | null;
  isCommander?: boolean;
  isAdmin?: boolean;
}

/**
 * Parse permission scope from string format: "resource:action:scopeType:scopeValue"
 * Examples:
 * - "soldiers.read" -> { resource: "soldiers", action: "read", scope: null }
 * - "soldiers.read:department:123" -> { resource: "soldiers", action: "read", scope: { type: "department", value: 123 } }
 */
export function parsePermission(permissionString: string): {
  resource: string;
  action: string;
  scope: PermissionScope | null;
} {
  const parts = permissionString.split(':');
  
  if (parts.length < 2) {
    throw new ValidationError(`Invalid permission format: ${permissionString}`);
  }

  const resource = parts[0];
  const action = parts[1];
  let scope: PermissionScope | null = null;

  if (parts.length >= 3) {
    const scopeType = parts[2] as PermissionScope['type'];
    const scopeValue = parts.length >= 4 ? parts[3] : undefined;
    
    if (scopeType === 'all') {
      scope = { type: 'all' };
    } else if (scopeType && ['department', 'role', 'user'].includes(scopeType)) {
      scope = {
        type: scopeType,
        value: scopeValue ? (scopeType === 'department' || scopeType === 'role' || scopeType === 'user' 
          ? parseInt(scopeValue, 10) 
          : scopeValue) : undefined,
      };
    }
  }

  return { resource, action, scope };
}

/**
 * Check if a permission scope matches the context
 */
function scopeMatches(scope: PermissionScope | null, context: PermissionContext): boolean {
  if (!scope || scope.type === 'all') {
    return true;
  }

  switch (scope.type) {
    case 'department':
      return context.departmentId === scope.value;
    case 'role':
      return context.roleId === scope.value;
    case 'user':
      return context.userId === scope.value;
    default:
      return false;
  }
}

/**
 * Check if user has permission with scope support
 */
export async function hasScopedPermission(
  userId: number,
  permissionString: string,
  context?: Partial<PermissionContext>
): Promise<boolean> {
  // Get user context (fetch full user to get isAdmin)
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return false;
  }

  // Admins have all permissions
  const userIsAdmin = (user as any).isAdmin ?? false;
  if (userIsAdmin) {
    return true;
  }

  // Merge user context with provided context
  const fullContext: PermissionContext = {
    userId: user.id,
    departmentId: context?.departmentId ?? user.departmentId,
    roleId: context?.roleId ?? user.roleId,
    isCommander: context?.isCommander ?? user.isCommander,
    isAdmin: userIsAdmin,
  };

  // Parse permission
  const { resource, action, scope } = parsePermission(permissionString);

  // Check direct user permissions
  const userPermissions = await (prisma as any).userPermission.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      permission: true,
    },
  });

  for (const userPerm of userPermissions) {
    const perm = userPerm.permission;
    if (perm.resource === resource && perm.action === action) {
      // Check if permission has scope stored (we'll add this field later)
      // For now, check if scope matches
      if (!scope || scopeMatches(scope, fullContext)) {
        return true;
      }
    }
  }

  // Check role permissions
  if (user.roleId) {
    const rolePermissions = await (prisma as any).rolePermission.findMany({
      where: {
        roleId: user.roleId,
        isActive: true,
      },
      include: {
        permission: true,
      },
    });

    for (const rolePerm of rolePermissions) {
      const perm = rolePerm.permission;
      if (perm.resource === resource && perm.action === action) {
        if (!scope || scopeMatches(scope, fullContext)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Permission Policy - Dynamic rules for permissions
 * Example: Commander can only see soldiers in their department
 */
export interface PermissionPolicy {
  name: string;
  description: string;
  check: (context: PermissionContext, resource?: any) => boolean | Promise<boolean>;
}

/**
 * Built-in permission policies
 */
export const permissionPolicies: Record<string, PermissionPolicy> = {
  /**
   * Commander can only access resources in their department
   */
  commanderDepartmentScope: {
    name: 'commanderDepartmentScope',
    description: 'Commander can only access resources in their department',
    check: async (context: PermissionContext, resource?: any) => {
      if (!context.isCommander || !context.departmentId) {
        return true; // Not a commander, policy doesn't apply
      }

      // If resource has departmentId, check if it matches
      if (resource && typeof resource === 'object') {
        const resourceDeptId = resource.departmentId || resource.department?.id;
        return resourceDeptId === context.departmentId;
      }

      return true; // No resource provided, allow
    },
  },

  /**
   * User can only access their own resources
   */
  ownResourcesOnly: {
    name: 'ownResourcesOnly',
    description: 'User can only access their own resources',
    check: (context: PermissionContext, resource?: any) => {
      if (resource && typeof resource === 'object') {
        const resourceUserId = resource.userId || resource.id;
        return resourceUserId === context.userId;
      }
      return true;
    },
  },
};

/**
 * Check permission with policy enforcement
 * Admins always have all permissions and bypass all policies
 */
export async function hasPermissionWithPolicy(
  userId: number,
  permissionString: string,
  policies: string[] = [],
  context?: Partial<PermissionContext>,
  resource?: any
): Promise<boolean> {
  // Get full context first to check if user is admin
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return false;
  }

  const userIsAdmin = (user as any).isAdmin ?? false;

  // Admins have all permissions and bypass all policies
  if (userIsAdmin) {
    return true;
  }

  // First check basic permission
  const hasPermission = await hasScopedPermission(userId, permissionString, context);
  if (!hasPermission) {
    return false;
  }

  const fullContext: PermissionContext = {
    userId: user.id,
    departmentId: context?.departmentId ?? user.departmentId ?? null,
    roleId: context?.roleId ?? user.roleId ?? null,
    isCommander: context?.isCommander ?? user.isCommander ?? false,
    isAdmin: userIsAdmin,
  };

  // Apply policies
  for (const policyName of policies) {
    const policy = permissionPolicies[policyName];
    if (policy) {
      const policyResult = await policy.check(fullContext, resource);
      if (!policyResult) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Middleware to check permissions with policies
 */
export function requirePermission(
  permission: string,
  policies: string[] = []
) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = req.user;
      if (!user || !user.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const resource = req.params?.id ? { id: parseInt(req.params.id) } : undefined;
      const hasAccess = await hasPermissionWithPolicy(
        user.userId,
        permission,
        policies,
        undefined,
        resource
      );

      if (!hasAccess) {
        throw new UnauthorizedError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get filtered resources based on user permissions and policies
 * Example: Get only soldiers in commander's department
 */
export async function filterResourcesByPermission<T extends Record<string, any>>(
  userId: number,
  resources: T[],
  permission: string,
  policies: string[] = [],
  context?: Partial<PermissionContext>
): Promise<T[]> {
  const user = await prisma.soldier.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return [];
  }

  // Admins see all
  const userIsAdmin = (user as any).isAdmin ?? false;
  if (userIsAdmin) {
    return resources;
  }

  const fullContext: PermissionContext = {
    userId: user.id,
    departmentId: context?.departmentId ?? user.departmentId ?? null,
    roleId: context?.roleId ?? user.roleId ?? null,
    isCommander: context?.isCommander ?? user.isCommander ?? false,
    isAdmin: (user as any).isAdmin ?? false,
  };

  // Check each resource
  const filtered: T[] = [];
  for (const resource of resources) {
    const hasAccess = await hasPermissionWithPolicy(
      userId,
      permission,
      policies,
      fullContext,
      resource
    );
    if (hasAccess) {
      filtered.push(resource);
    }
  }

  return filtered;
}
