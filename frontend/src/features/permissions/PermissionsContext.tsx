import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../shared/lib/api';
import { useAuth } from '../auth/AuthContext';

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
  source?: 'user' | 'role';
  role?: {
    id: number;
    name: string;
  };
}

export interface PagePermission {
  page: string;
  view: boolean;
  edit: boolean;
}

interface PermissionsContextType {
  permissions: Permission[];
  pagePermissions: Record<string, PagePermission>;
  isLoading: boolean;
  hasPermission: (permissionName: string) => boolean;
  hasResourcePermission: (resource: string, action: string) => boolean;
  hasPagePermission: (page: string, action: 'view' | 'edit') => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pagePermissions, setPagePermissions] = useState<Record<string, PagePermission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadPermissions = useCallback(async () => {
    // Wait for auth to finish loading before checking permissions
    if (authLoading) {
      return;
    }

    if (!user) {
      setPermissions([]);
      setPagePermissions({});
      setIsLoading(false);
      return;
    }

    try {
      // Load permissions separately to handle errors gracefully
      let permissionsData: Permission[] = [];
      let pagePermissionsData: Record<string, PagePermission> = {};

      try {
        const permissionsRes = await apiClient.get('/permissions/my-permissions');
        permissionsData = permissionsRes.data.map((item: any) => ({
        id: item.permission.id,
        name: item.permission.name,
        description: item.permission.description,
        resource: item.permission.resource,
        action: item.permission.action,
        source: item.source,
        role: item.role,
      }));
      } catch (error) {
        console.warn('Failed to load permissions (non-critical):', error);
        // Continue even if permissions fail
      }

      try {
        const pagePermissionsRes = await apiClient.get('/permissions/my-page-permissions');
        pagePermissionsData = pagePermissionsRes.data || {};
      } catch (error) {
        console.warn('Failed to load page permissions (non-critical):', error);
        // Continue even if page permissions fail - admins will still work
      }

      setPermissions(permissionsData);
      setPagePermissions(pagePermissionsData);
      setHasError(false);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
      setPagePermissions({});
      setHasError(true);
      // Don't block the app - continue with empty permissions
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;
    // Admins have all permissions
    if (user.isAdmin) return true;
    return permissions.some(p => p.name === permissionName);
  }, [user, permissions]);

  const hasResourcePermission = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;
    // Admins have all permissions
    if (user.isAdmin) return true;
    return permissions.some(p => p.resource === resource && p.action === action);
  }, [user, permissions]);

  const hasPagePermission = useCallback((page: string, action: 'view' | 'edit'): boolean => {
    if (!user) return false;
    // Admins have all permissions
    if (user.isAdmin) return true;
    const pagePerm = pagePermissions[page];
    if (!pagePerm) return false;
    // Edit permission includes view
    if (action === 'view') {
      return pagePerm.view || pagePerm.edit;
    }
    return pagePerm.edit;
  }, [user, pagePermissions]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        pagePermissions,
        // Keep loading state true while auth is loading to prevent premature permission checks
        isLoading: isLoading || authLoading,
        hasPermission,
        hasResourcePermission,
        hasPagePermission,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
