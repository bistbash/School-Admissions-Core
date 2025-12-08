import { useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useHasPermission } from '../../features/permissions/usePermission';

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string | { resource: string; action: string; scope?: { type: string; value?: number | string } };
  visible?: boolean;
  children?: NavigationItem[];
}

/**
 * Hook to generate dynamic navigation based on user permissions
 * Supports:
 * - Permission-based visibility
 * - Scoped permissions
 * - Nested navigation items
 */
export function useDynamicNavigation(items: NavigationItem[]) {
  const { user } = useAuth();
  const hasPermission = useHasPermission();

  const filteredItems = useMemo(() => {
    if (!user) return [];

    return items
      .map((item) => {
        // Check if item should be visible
        if (item.visible === false) {
          return null;
        }

        // Check permission
        if (item.permission) {
          const hasAccess = hasPermission(item.permission);
          if (!hasAccess) {
            return null;
          }
        }

        // Process children recursively
        const processedItem = { ...item };
        if (item.children && item.children.length > 0) {
          processedItem.children = item.children
            .map((child) => {
              if (child.visible === false) return null;
              if (child.permission) {
                const hasAccess = hasPermission(child.permission);
                if (!hasAccess) return null;
              }
              return child;
            })
            .filter((child): child is NavigationItem => child !== null);
        }

        return processedItem;
      })
      .filter((item): item is NavigationItem => item !== null);
  }, [user, items, hasPermission]);

  return filteredItems;
}

/**
 * Hook to check if a navigation item should be visible
 */
export function useNavigationVisibility(item: NavigationItem) {
  const { user } = useAuth();
  const hasPermission = useHasPermission();

  return useMemo(() => {
    if (!user) return false;
    if (item.visible === false) return false;
    if (!item.permission) return true;

    return hasPermission(item.permission);
  }, [user, item, hasPermission]);
}
