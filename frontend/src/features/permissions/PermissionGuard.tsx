import React from 'react';
import { usePermissions } from './PermissionsContext';
import { useAuth } from '../auth/AuthContext';
import { Error403Page } from '../errors/Error403Page';

interface PermissionGuardProps {
  permission?: string;
  resource?: string;
  action?: string;
  page?: string;
  pageAction?: 'view' | 'edit';
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
  page,
  pageAction,
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission, hasResourcePermission, hasPagePermission, isLoading } = usePermissions();
  const { user } = useAuth();

  // Show loading state while permissions are loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-[#FAFAFA]"></div>
      </div>
    );
  }

  // Admins always have access
  if (user?.isAdmin) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (page && pageAction) {
    hasAccess = hasPagePermission(page, pageAction);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (resource && action) {
    hasAccess = hasResourcePermission(resource, action);
  } else {
    // If no permission specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    // Use Error403Page as default fallback if none provided
    return <>{fallback !== null ? fallback : <Error403Page />}</>;
  }

  return <>{children}</>;
}
