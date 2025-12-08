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

interface PermissionsContextType {
  permissions: Permission[];
  isLoading: boolean;
  hasPermission: (permissionName: string) => boolean;
  hasResourcePermission: (resource: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/permissions/my-permissions');
      // Transform the response to match our Permission interface
      const transformedPermissions: Permission[] = response.data.map((item: any) => ({
        id: item.permission.id,
        name: item.permission.name,
        description: item.permission.description,
        resource: item.permission.resource,
        action: item.permission.action,
        source: item.source,
        role: item.role,
      }));
      setPermissions(transformedPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        isLoading,
        hasPermission,
        hasResourcePermission,
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
