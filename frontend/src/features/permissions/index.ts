/**
 * Permissions Module
 * 
 * Centralized exports for the permissions system
 */

// Context providers
export { PermissionsProvider, usePermissions } from './PermissionsContext';
export { PageModeProvider, usePageMode } from './PageModeContext';

// Components
export { PermissionGuard } from './PermissionGuard';
export { PageModeToggle } from './PageModeToggle';

// Hooks
export { useHasPermission } from './usePermission';

// Types
export type { Permission, PagePermission } from './PermissionsContext';
export type { PageMode } from './PageModeContext';
