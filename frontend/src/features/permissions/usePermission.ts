import { useCallback } from 'react';
import { usePermissions } from './PermissionsContext';
import { useAuth } from '../auth/AuthContext';

/**
 * Permission hooks for checking user permissions
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
