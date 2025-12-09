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
 * Component that conditionally renders children based on page permissions
 * 
 * Now only supports page permissions - the system works exclusively with page permissions
 * 
 * Usage:
 * <PermissionGuard page="students" pageAction="view">
 *   <StudentsList />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  page,
  pageAction,
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPagePermission, isLoading: permissionsLoading } = usePermissions();
  const { user, isLoading: authLoading } = useAuth();

  // Show loading state while permissions or auth are loading
  // This prevents showing 403 error before auth state is fully loaded
  if (permissionsLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-[#FAFAFA]"></div>
      </div>
    );
  }

  // If no user, don't show 403 - let ProtectedRoute handle the redirect
  // This prevents flashing 403 during auth state initialization
  if (!user) {
    return null;
  }

  // Admins always have access
  if (user.isAdmin) {
    return <>{children}</>;
  }

  // Page and pageAction are required
  if (!page || !pageAction) {
    console.error('PermissionGuard: page and pageAction are required');
    return <>{fallback !== null ? fallback : <Error403Page />}</>;
  }

  // Check page permission
  const hasAccess = hasPagePermission(page, pageAction);

  if (!hasAccess) {
    // Use Error403Page as default fallback if none provided
    return <>{fallback !== null ? fallback : <Error403Page />}</>;
  }

  return <>{children}</>;
}
