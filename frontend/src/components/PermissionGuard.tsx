import React from 'react';
import { usePermissions } from '../contexts/PermissionsContext';

interface PermissionGuardProps {
  permission?: string;
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * Usage:
 * <PermissionGuard permission="students.read">
 *   <StudentsList />
 * </PermissionGuard>
 * 
 * Or with resource/action:
 * <PermissionGuard resource="students" action="read">
 *   <StudentsList />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permission, 
  resource, 
  action, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission, hasResourcePermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (resource && action) {
    hasAccess = hasResourcePermission(resource, action);
  } else {
    // If no permission specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
