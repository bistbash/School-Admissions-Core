import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from './PermissionsContext';

export type PageMode = 'view' | 'edit';

interface PageModeContextType {
  mode: PageMode;
  setMode: (mode: PageMode) => void;
  canEdit: boolean;
  supportsEditMode: boolean;
  toggleMode: () => void;
}

const PageModeContext = createContext<PageModeContextType | undefined>(undefined);

/**
 * Mapping of page names to whether they support edit mode
 * This should match the supportsEditMode field in the backend PAGE_PERMISSIONS
 */
const PAGE_EDIT_MODE_SUPPORT: Record<string, boolean> = {
  'dashboard': false, // לוח בקרה - צפייה בלבד
  'students': true, // תלמידים - יש מצב עריכה
  'resources': true, // ניהול משאבים - יש מצב עריכה
  'soc': false, // מרכז אבטחה - צפייה בלבד
  'api-keys': true, // מפתחות API - יש מצב עריכה
  'settings': false, // הגדרות - צפייה בלבד
};

/**
 * Provider for managing page view/edit mode
 * Automatically determines if the current page supports edit mode
 */
export function PageModeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { hasPagePermission, isLoading: permissionsLoading } = usePermissions();
  const [mode, setModeState] = useState<PageMode>('view');

  // Get current page from path
  const getCurrentPage = useCallback(() => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    // Map route paths to page names
    const routeToPage: Record<string, string> = {
      'dashboard': 'dashboard',
      'students': 'students',
      'resources': 'resources',
      'permissions': 'permissions',
      'soc': 'soc',
      'api': 'api-keys',
      'api-keys': 'api-keys',
    };
    return routeToPage[path] || path;
  }, [location.pathname]);

  const currentPage = getCurrentPage();
  const supportsEditMode = PAGE_EDIT_MODE_SUPPORT[currentPage] ?? true; // Default to true if not specified
  // Only check edit permission if permissions are loaded
  const canEdit = !permissionsLoading && hasPagePermission(currentPage, 'edit');

  // Reset to view mode when page changes
  useEffect(() => {
    setModeState('view');
  }, [currentPage]);

  // Auto-switch to view mode if user doesn't have edit permission
  useEffect(() => {
    if (mode === 'edit' && !canEdit) {
      setModeState('view');
    }
  }, [mode, canEdit]);

  const setMode = useCallback((newMode: PageMode) => {
    if (newMode === 'edit' && !canEdit) {
      return; // Don't allow switching to edit if user doesn't have permission
    }
    if (!supportsEditMode && newMode === 'edit') {
      return; // Don't allow switching to edit if page doesn't support it
    }
    setModeState(newMode);
  }, [canEdit, supportsEditMode]);

  const toggleMode = useCallback(() => {
    if (!supportsEditMode || !canEdit) {
      return;
    }
    setModeState(prev => prev === 'view' ? 'edit' : 'view');
  }, [supportsEditMode, canEdit]);

  return (
    <PageModeContext.Provider
      value={{
        mode,
        setMode,
        canEdit,
        supportsEditMode,
        toggleMode,
      }}
    >
      {children}
    </PageModeContext.Provider>
  );
}

const defaultContextValue: PageModeContextType = {
  mode: 'view',
  setMode: () => {},
  canEdit: false,
  supportsEditMode: true,
  toggleMode: () => {},
};

export function usePageMode() {
  const context = useContext(PageModeContext);
  // Return default values instead of throwing - this allows components to work even if provider isn't ready
  if (context === undefined) {
    console.warn('usePageMode called outside PageModeProvider, using defaults');
    return defaultContextValue;
  }
  return context;
}
