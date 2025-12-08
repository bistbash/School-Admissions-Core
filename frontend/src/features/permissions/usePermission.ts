import { useCallback } from 'react';
import { usePermissions } from './PermissionsContext';
import { useAuth } from '../auth/AuthContext';

/**
 * Advanced permission hooks for dynamic permission checking
 */

/**
 * Check if user has a specific permission
 * Supports scoped permissions: "resource:action:scope:value"
 * Example: "soldiers.read:department:123"
 */
export function useHasPermission() {
  const { hasPermission, hasResourcePermission } = usePermissions();
  const { user } = useAuth();

  return useCallback(
    (permission: string | { resource: string; action: string; scope?: { type: string; value?: number | string } }) => {
      if (!user) return false;
      if (user.isAdmin) return true;

      if (typeof permission === 'string') {
        // Check if it's a scoped permission
        if (permission.includes(':')) {
          const parts = permission.split(':');
          if (parts.length >= 2) {
            const resource = parts[0];
            const action = parts[1];
            
            // If there's a scope, check it
            if (parts.length >= 3) {
              const scopeType = parts[2];
              const scopeValue = parts.length >= 4 ? parts[3] : undefined;

              // Check scope based on user context
              if (scopeType === 'department' && scopeValue) {
                const deptId = parseInt(scopeValue, 10);
                if (user.departmentId !== deptId) {
                  return false;
                }
              } else if (scopeType === 'role' && scopeValue) {
                const roleId = parseInt(scopeValue, 10);
                if (user.roleId !== roleId) {
                  return false;
                }
              } else if (scopeType === 'user' && scopeValue) {
                const userId = parseInt(scopeValue, 10);
                if (user.id !== userId) {
                  return false;
                }
              }
            }

            return hasResourcePermission(resource, action);
          }
        }
        return hasPermission(permission);
      } else {
        return hasResourcePermission(permission.resource, permission.action);
      }
    },
    [user, hasPermission, hasResourcePermission]
  );
}

/**
 * Check if user can access a specific resource
 * Useful for checking if user can view/edit/delete a specific item
 */
export function useCanAccessResource() {
  const hasPermission = useHasPermission();
  const { user } = useAuth();

  return useCallback(
    (
      resource: string,
      action: string,
      resourceData?: { departmentId?: number; userId?: number; roleId?: number }
    ) => {
      if (!user) return false;
      if (user.isAdmin) return true;

      // Check basic permission
      const hasBasicPermission = hasPermission({ resource, action });
      if (!hasBasicPermission) {
        return false;
      }

      // Apply policies based on user role
      if (resourceData) {
        // Commander can only access resources in their department
        if (user.isCommander && user.departmentId) {
          if (resourceData.departmentId && resourceData.departmentId !== user.departmentId) {
            return false;
          }
        }

        // User can always access their own resources
        if (resourceData.userId === user.id) {
          return true;
        }
      }

      return true;
    },
    [user, hasPermission]
  );
}

/**
 * Filter resources based on user permissions
 * Example: Filter soldiers to show only those in commander's department
 */
export function useFilteredResources<T extends Record<string, any>>() {
  const canAccessResource = useCanAccessResource();
  const { user } = useAuth();

  return useCallback(
    (
      resources: T[],
      resourceType: string,
      action: string = 'read'
    ): T[] => {
      if (!user) return [];
      if (user.isAdmin) return resources;

      return resources.filter((resource) => {
        const resourceData = {
          departmentId: resource.departmentId || resource.department?.id,
          userId: resource.userId || resource.id,
          roleId: resource.roleId || resource.role?.id,
        };

        return canAccessResource(resourceType, action, resourceData);
      });
    },
    [user, canAccessResource]
  );
}

/**
 * Get user's accessible departments
 * Useful for filtering dropdowns and lists
 */
export function useAccessibleDepartments() {
  const { user } = useAuth();
  const hasPermission = useHasPermission();

  return useCallback(async () => {
    if (!user) return [];
    if (user.isAdmin) return null; // null means all departments

    // If user is commander, they can only see their department
    if (user.isCommander && user.departmentId) {
      return [user.departmentId];
    }

    // Check if user has department-scoped permissions
    // This would require backend support
    return null; // null means all accessible departments
  }, [user, hasPermission]);
}
