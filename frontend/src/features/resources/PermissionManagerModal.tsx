/**
 * Permission Manager Modal
 * 
 * Professional permission management interface for users and roles.
 * Features optimistic updates, smooth UX, and consistent behavior.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../shared/lib/api';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Eye, Edit, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { useAuth } from '../auth/AuthContext';
import { usePageMode } from '../permissions/PageModeContext';
import { cn } from '../../shared/lib/utils';

interface PagePermission {
  page: string;
  displayName: string;
  displayNameHebrew: string;
  description: string;
  descriptionHebrew: string;
  category: string;
  categoryHebrew: string;
  viewAPIs: Array<{ resource: string; action: string; description: string; descriptionHebrew: string }>;
  editAPIs: Array<{ resource: string; action: string; description: string; descriptionHebrew: string }>;
  supportsEditMode?: boolean;
  customModes?: Array<{ id: string; name: string; nameHebrew: string; description: string; descriptionHebrew: string }>;
}

interface UserPagePermissions {
  [page: string]: {
    view: boolean;
    edit: boolean;
    customModes?: string[];
    viewFromRole?: boolean;
    editFromRole?: boolean;
  };
}

interface PermissionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'user' | 'role';
  targetId: number;
  targetName: string;
}

export function PermissionManagerModal({
  isOpen,
  onClose,
  type,
  targetId,
  targetName,
}: PermissionManagerModalProps) {
  const { user } = useAuth();
  const { mode } = usePageMode();
  const [pages, setPages] = useState<PagePermission[]>([]);
  const [pagePermissions, setPagePermissions] = useState<UserPagePermissions>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEditWarningModal, setShowEditWarningModal] = useState(false);
  const [pendingEditPage, setPendingEditPage] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // Only admins can manage permissions
  if (!user?.isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`ניהול הרשאות - ${targetName}`} size="xl">
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            רק מנהלים יכולים לנהל הרשאות
          </p>
        </div>
      </Modal>
    );
  }

  // Only allow permission changes in edit mode
  if (mode !== 'edit') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`ניהול הרשאות - ${targetName}`} size="xl">
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            ניתן לשנות הרשאות רק במצב עריכה. עבור למצב עריכה כדי לנהל הרשאות.
          </p>
        </div>
      </Modal>
    );
  }

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && targetId) {
      loadData();
    } else {
      // Reset state when modal closes
      setPages([]);
      setPagePermissions({});
      setIsLoading(false);
      setSearchQuery('');
      setPendingOperations(new Set());
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetId, type]);

  const loadData = useCallback(async (silent = false) => {
    if (!isOpen || !targetId || targetId <= 0) {
      return;
    }

    try {
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage(null);
      
      // Save scroll position before reload (only in silent mode to prevent jumps)
      let scrollPosition = 0;
      if (silent) {
        const modalContent = document.querySelector('[data-modal-content]') as HTMLElement;
        scrollPosition = modalContent?.scrollTop || 0;
      }
      
      const [pagesRes, permissionsRes] = await Promise.all([
        apiClient.get('/permissions/pages'),
        type === 'user'
          ? apiClient.get(`/permissions/users/${targetId}/page-permissions`).catch(() => ({ data: {} }))
          : apiClient.get(`/permissions/roles/${targetId}/page-permissions`).catch(() => ({ data: {} }))
      ]);
      
      setPages(pagesRes.data || []);
      setPagePermissions(permissionsRes.data || {});
      
      // Restore scroll position after state update (only in silent mode)
      if (silent && scrollPosition > 0) {
        // Use double requestAnimationFrame to ensure DOM has fully updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const modalContent = document.querySelector('[data-modal-content]') as HTMLElement;
            if (modalContent) {
              modalContent.scrollTop = scrollPosition;
            }
          });
        });
      }
    } catch (error: any) {
      console.error('Failed to load permissions:', error);
      if (!silent) {
        setErrorMessage('שגיאה בטעינת הרשאות. אנא רענן את הדף.');
      }
      setPages([]);
      setPagePermissions({});
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [isOpen, targetId, type]);

  // Optimistic update helper
  const updatePermissionOptimistically = useCallback((page: string, action: 'view' | 'edit', value: boolean) => {
    setPagePermissions(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [action]: value,
        view: action === 'edit' && value ? true : (prev[page]?.view || false),
      }
    }));
  }, []);

  const handleGrantPermission = useCallback(async (page: string, action: 'view' | 'edit', skipWarning = false) => {
    // Show warning modal only for edit permissions on 'api-keys' page
    if (action === 'edit' && page === 'api-keys' && !skipWarning) {
      setPendingEditPage(page);
      setShowEditWarningModal(true);
      return;
    }

    const operationKey = `${page}:${action}:grant`;
    
    // Prevent duplicate operations
    if (pendingOperations.has(operationKey)) {
      return;
    }

    try {
      setPendingOperations(prev => new Set(prev).add(operationKey));
      setErrorMessage(null);

      // Optimistic update
      updatePermissionOptimistically(page, action, true);

      // Make API call
      const endpoint = type === 'user'
        ? `/permissions/users/${targetId}/grant-page`
        : `/permissions/roles/${targetId}/grant-page`;
      
      await apiClient.post(endpoint, { page, action });

      // Silently reload to ensure consistency (preserves scroll position)
      await loadData(true);
    } catch (error: any) {
      // Check if it's a conflict (409) - means permission already exists (idempotent)
      if (error.response?.status === 409 || error.response?.status === 200) {
        // Permission already granted - this is fine, just reload silently
        await loadData(true);
        return;
      }
      
      // Check if it's a validation error (400) or forbidden (403)
      if (error.response?.status === 400 || error.response?.status === 403) {
        const errorData = error.response?.data;
        let errorMsg = 'שגיאה במתן הרשאה';
        
        if (errorData?.error) {
          errorMsg = errorData.error;
        } else if (errorData?.details && Array.isArray(errorData.details)) {
          // Zod validation errors
          errorMsg = errorData.details.map((d: any) => d.message || d).join(', ');
        } else if (errorData?.message) {
          errorMsg = errorData.message;
        }
        
        // Special handling for "Cannot edit your own permissions"
        if (errorMsg.includes('Cannot edit your own permissions') || errorMsg.includes('עצמך')) {
          errorMsg = 'לא ניתן לערוך את ההרשאות שלך. בקש ממנהל אחר לעשות זאת.';
        }
        
        // Revert optimistic update
        updatePermissionOptimistically(page, action, false);
        setErrorMessage(errorMsg);
        console.error('Failed to grant permission (400/403):', errorData);
        return;
      }
      
      // Revert optimistic update for other errors
      updatePermissionOptimistically(page, action, false);
      
      const errorMsg = error.response?.data?.error || error.message || 'שגיאה במתן הרשאה';
      setErrorMessage(errorMsg);
      console.error('Failed to grant permission:', error);
    } finally {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  }, [targetId, type, pendingOperations, updatePermissionOptimistically, loadData]);

  const handleRevokePermission = useCallback(async (page: string, action: 'view' | 'edit') => {
    const operationKey = `${page}:${action}:revoke`;
    
    if (pendingOperations.has(operationKey)) {
      return;
    }

    try {
      setPendingOperations(prev => new Set(prev).add(operationKey));
      setErrorMessage(null);

      // Optimistic update
      updatePermissionOptimistically(page, action, false);

      const endpoint = type === 'user'
        ? `/permissions/users/${targetId}/revoke-page`
        : `/permissions/roles/${targetId}/revoke-page`;
      
      await apiClient.post(endpoint, { page, action });
      
      // Silently reload to ensure consistency (preserves scroll position)
      await loadData(true);
    } catch (error: any) {
      // Check if it's 404 - means permission doesn't exist (idempotent, already revoked)
      if (error.response?.status === 404 || error.response?.status === 200) {
        // Permission already revoked - this is fine, just reload silently
        await loadData(true);
        return;
      }
      
      // Check if it's a validation error (400) or forbidden (403)
      if (error.response?.status === 400 || error.response?.status === 403) {
        const errorData = error.response?.data;
        let errorMsg = 'שגיאה בהסרת הרשאה';
        
        if (errorData?.error) {
          errorMsg = errorData.error;
        } else if (errorData?.details && Array.isArray(errorData.details)) {
          // Zod validation errors
          errorMsg = errorData.details.map((d: any) => d.message || d).join(', ');
        } else if (errorData?.message) {
          errorMsg = errorData.message;
        }
        
        // Special handling for "Cannot edit your own permissions"
        if (errorMsg.includes('Cannot edit your own permissions') || errorMsg.includes('עצמך')) {
          errorMsg = 'לא ניתן לערוך את ההרשאות שלך. בקש ממנהל אחר לעשות זאת.';
        }
        
        // Revert optimistic update
        updatePermissionOptimistically(page, action, true);
        setErrorMessage(errorMsg);
        console.error('Failed to revoke permission (400/403):', errorData);
        return;
      }
      
      // Revert optimistic update for other errors
      updatePermissionOptimistically(page, action, true);
      
      let errorMsg = error.response?.data?.error || error.message || 'שגיאה בהסרת הרשאה';
      
      // Check if permission comes from role
      if (errorMsg.includes('granted through the user\'s role') || errorMsg.includes('תפקיד')) {
        errorMsg = 'לא ניתן להסיר הרשאה זו - היא ניתנה דרך התפקיד. הסר אותה מהתפקיד במקום.';
      }
      
      // Check if view is included in edit
      if (errorMsg.includes('edit permission which includes view') || errorMsg.includes('עריכה כוללת צפייה')) {
        errorMsg = 'לא ניתן להסיר הרשאת צפייה - המשתמש יש לו הרשאת עריכה שכוללת צפייה. הסר את הרשאת העריכה במקום.';
      }
      
      setErrorMessage(errorMsg);
      console.error('Failed to revoke permission:', error);
    } finally {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  }, [targetId, type, pendingOperations, updatePermissionOptimistically, loadData]);

  const handleGrantCustomMode = useCallback(async (page: string, modeId: string) => {
    const operationKey = `${page}:mode:${modeId}:grant`;
    
    if (pendingOperations.has(operationKey)) {
      return;
    }

    try {
      setPendingOperations(prev => new Set(prev).add(operationKey));
      setErrorMessage(null);

      // Optimistic update
      setPagePermissions(prev => ({
        ...prev,
        [page]: {
          ...prev[page],
          customModes: [...(prev[page]?.customModes || []), modeId],
        }
      }));

      const endpoint = type === 'user'
        ? `/permissions/users/${targetId}/grant-custom-mode`
        : `/permissions/roles/${targetId}/grant-custom-mode`;
      
      await apiClient.post(endpoint, { page, modeId });
      // Silently reload to ensure consistency (preserves scroll position)
      await loadData(true);
    } catch (error: any) {
      // Check if it's a conflict (409) - means permission already exists (idempotent)
      if (error.response?.status === 409 || error.response?.status === 200) {
        // Permission already granted - this is fine, just reload
        await loadData();
        return;
      }
      
      // Revert for other errors
      setPagePermissions(prev => ({
        ...prev,
        [page]: {
          ...prev[page],
          customModes: (prev[page]?.customModes || []).filter(id => id !== modeId),
        }
      }));
      
      const errorMsg = error.response?.data?.error || error.message || 'שגיאה במתן מצב צפייה';
      setErrorMessage(errorMsg);
    } finally {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  }, [targetId, type, pendingOperations, loadData]);

  const handleRevokeCustomMode = useCallback(async (page: string, modeId: string) => {
    const operationKey = `${page}:mode:${modeId}:revoke`;
    
    if (pendingOperations.has(operationKey)) {
      return;
    }

    try {
      setPendingOperations(prev => new Set(prev).add(operationKey));
      setErrorMessage(null);

      // Optimistic update
      setPagePermissions(prev => ({
        ...prev,
        [page]: {
          ...prev[page],
          customModes: (prev[page]?.customModes || []).filter(id => id !== modeId),
        }
      }));

      const endpoint = type === 'user'
        ? `/permissions/users/${targetId}/revoke-custom-mode`
        : `/permissions/roles/${targetId}/revoke-custom-mode`;
      
      await apiClient.post(endpoint, { page, modeId });
      // Silently reload to ensure consistency (preserves scroll position)
      await loadData(true);
    } catch (error: any) {
      // Check if it's 404 - means permission doesn't exist (idempotent, already revoked)
      if (error.response?.status === 404 || error.response?.status === 200) {
        // Permission already revoked - this is fine, just reload silently
        await loadData(true);
        return;
      }
      
      // Revert for other errors
      setPagePermissions(prev => ({
        ...prev,
        [page]: {
          ...prev[page],
          customModes: [...(prev[page]?.customModes || []), modeId],
        }
      }));
      
      const errorMsg = error.response?.data?.error || error.message || 'שגיאה בהסרת מצב צפייה';
      setErrorMessage(errorMsg);
    } finally {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationKey);
        return next;
      });
    }
  }, [targetId, type, pendingOperations, loadData]);

  // Filter and group pages
  const { filteredPages } = useMemo(() => {
    const filtered = pages.filter((p) => {
      const query = searchQuery.toLowerCase();
      return (
        p.displayName.toLowerCase().includes(query) ||
        p.displayNameHebrew?.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.descriptionHebrew?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.categoryHebrew?.toLowerCase().includes(query)
      );
    });

    // Don't group by categories - just return all filtered pages
    return { filteredPages: filtered };
  }, [pages, searchQuery]);

  // Check if operation is pending
  const isOperationPending = useCallback((page: string, action: 'view' | 'edit' | 'custom', modeId?: string) => {
    if (action === 'custom' && modeId) {
      return pendingOperations.has(`${page}:mode:${modeId}:grant`) || 
             pendingOperations.has(`${page}:mode:${modeId}:revoke`);
    }
    return pendingOperations.has(`${page}:${action}:grant`) || 
           pendingOperations.has(`${page}:${action}:revoke`);
  }, [pendingOperations]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`ניהול הרשאות - ${targetName}`}
      subtitle={type === 'user' ? 'הענק או הסר הרשאות למשתמש זה' : 'הענק או הסר הרשאות לתפקיד זה - כל משתמש עם התפקיד יקבל את ההרשאות אוטומטית'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Search */}
        <div>
          <Input
            placeholder="חפש דפים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPages.map((page) => {
                      const hasView = pagePermissions[page.page]?.view || false;
                      const hasEdit = pagePermissions[page.page]?.edit || false;
                      const hasCustomModes = pagePermissions[page.page]?.customModes || [];
                      const viewFromRole = pagePermissions[page.page]?.viewFromRole || false;
                      const editFromRole = pagePermissions[page.page]?.editFromRole || false;
                      // Only show edit button if page explicitly supports edit mode
                      // If supportsEditMode is false or undefined, don't show edit button
                      const supportsEdit = page.supportsEditMode === true;
                      const customModes = page.customModes || [];

                      const isViewPending = isOperationPending(page.page, 'view');
                      const isEditPending = isOperationPending(page.page, 'edit');

                      // Get unique APIs - always deduplicate by resource:action
                      // This prevents showing the same permission multiple times (e.g., multiple soc:read tags)
                      const allAPIs = hasEdit 
                        ? [...page.viewAPIs, ...page.editAPIs]
                        : hasView 
                          ? page.viewAPIs 
                          : [];
                      
                      const uniqueAPIs = new Map<string, typeof page.viewAPIs[0]>();
                      allAPIs.forEach(api => {
                        const key = `${api.resource}:${api.action}`;
                        // Keep the first occurrence, but prefer description in Hebrew if available
                        if (!uniqueAPIs.has(key)) {
                          uniqueAPIs.set(key, api);
                        } else {
                          // If current API has Hebrew description and existing doesn't, replace it
                          const existing = uniqueAPIs.get(key)!;
                          if (api.descriptionHebrew && !existing.descriptionHebrew) {
                            uniqueAPIs.set(key, api);
                          }
                        }
                      });
                      const displayedAPIs = Array.from(uniqueAPIs.values());

                      return (
                        <div
                          key={page.page}
                          className="p-5 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#0a0a0a] hover:border-gray-300 dark:hover:border-[#2a2a2a] transition-colors"
                        >
                          <div className="mb-4">
                            <h4 className="font-semibold text-lg text-black dark:text-white mb-1">
                              {page.displayNameHebrew || page.displayName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {page.descriptionHebrew || page.description}
                            </p>
                          </div>

                          {/* Permission Buttons */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                              size="sm"
                              variant={hasView ? 'default' : 'outline'}
                              className={cn(
                                hasView && !(hasEdit && supportsEdit) && !viewFromRole && 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
                                hasView && ((hasEdit && supportsEdit) || viewFromRole) && 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400 cursor-not-allowed',
                                isViewPending && 'opacity-50 cursor-not-allowed'
                              )}
                              onClick={() => {
                                if (viewFromRole) {
                                  setErrorMessage('לא ניתן להסיר הרשאה זו - היא ניתנה דרך התפקיד. הסר אותה מהתפקיד במקום.');
                                  return;
                                }
                                if (hasEdit && supportsEdit) {
                                  setErrorMessage('לא ניתן להסיר הרשאת צפייה - המשתמש יש לו הרשאת עריכה שכוללת צפייה. הסר את הרשאת העריכה במקום.');
                                  return;
                                }
                                hasView ? handleRevokePermission(page.page, 'view') : handleGrantPermission(page.page, 'view');
                              }}
                              disabled={isViewPending || isEditPending || (hasEdit && supportsEdit) || viewFromRole}
                              title={
                                viewFromRole 
                                  ? 'הרשאה זו ניתנה דרך התפקיד - הסר אותה מהתפקיד במקום'
                                  : hasEdit && supportsEdit 
                                    ? 'צפייה כלולה בהרשאת עריכה - הסר עריכה כדי להסיר צפייה' 
                                    : undefined
                              }
                            >
                              {isViewPending ? (
                                <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                              ) : hasView ? (
                                <Check className="h-3 w-3 ml-1" />
                              ) : (
                                <Eye className="h-3 w-3 ml-1" />
                              )}
                              {hasView ? (viewFromRole ? 'צפייה (דרך תפקיד)' : hasEdit && supportsEdit ? 'צפייה (כלולה בעריכה)' : 'צפייה') : 'אפשר צפייה'}
                            </Button>

                            {supportsEdit ? (
                              <Button
                                size="sm"
                                variant={hasEdit ? 'default' : 'outline'}
                                className={cn(
                                  hasEdit && !editFromRole && 'bg-green-600 hover:bg-green-700 text-white border-green-600',
                                  hasEdit && editFromRole && 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400 cursor-not-allowed',
                                  isEditPending && 'opacity-50 cursor-not-allowed'
                                )}
                                onClick={() => {
                                  if (editFromRole) {
                                    setErrorMessage('לא ניתן להסיר הרשאה זו - היא ניתנה דרך התפקיד. הסר אותה מהתפקיד במקום.');
                                    return;
                                  }
                                  hasEdit ? handleRevokePermission(page.page, 'edit') : handleGrantPermission(page.page, 'edit');
                                }}
                                disabled={isViewPending || isEditPending || editFromRole}
                                title={editFromRole ? 'הרשאה זו ניתנה דרך התפקיד - הסר אותה מהתפקיד במקום' : undefined}
                              >
                                {isEditPending ? (
                                  <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                                ) : hasEdit ? (
                                  <Check className="h-3 w-3 ml-1" />
                                ) : (
                                  <Edit className="h-3 w-3 ml-1" />
                                )}
                                {hasEdit ? (editFromRole ? 'עריכה (דרך תפקיד)' : 'עריכה') : 'אפשר עריכה'}
                              </Button>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center px-3 py-1.5 rounded-md bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#1F1F1F]">
                                צפייה בלבד
                              </div>
                            )}
                          </div>

                          {/* Custom Modes */}
                          {customModes.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                מצבי צפייה מותאמים אישית:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {customModes.map((mode) => {
                                  const hasMode = hasCustomModes.includes(mode.id);
                                  const isPending = isOperationPending(page.page, 'custom', mode.id);
                                  
                                  return (
                                    <Button
                                      key={mode.id}
                                      size="sm"
                                      variant={hasMode ? 'default' : 'outline'}
                                      className={cn(
                                        hasMode && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
                                        isPending && 'opacity-50 cursor-not-allowed'
                                      )}
                                      onClick={() => hasMode ? handleRevokeCustomMode(page.page, mode.id) : handleGrantCustomMode(page.page, mode.id)}
                                      disabled={isPending}
                                      title={mode.descriptionHebrew || mode.description}
                                    >
                                      {isPending ? (
                                        <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                                      ) : hasMode ? (
                                        <Check className="h-3 w-3 ml-1" />
                                      ) : null}
                                      {mode.nameHebrew}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* API Permissions */}
                          {displayedAPIs.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                APIs שניתנו אוטומטית:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {displayedAPIs.map((api) => {
                                  // Color coding: blue for read permissions, green for create/update/delete
                                  const isReadAction = api.action === 'read';
                                  const colorClass = isReadAction
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
                                  
                                  // Use resource:action as key since we've already deduplicated
                                  const uniqueKey = `${api.resource}:${api.action}`;
                                  
                                  return (
                                    <span
                                      key={uniqueKey}
                                      className={cn('text-xs px-2 py-1 rounded-md font-medium border', colorClass)}
                                      title={api.descriptionHebrew || api.description || `${api.resource}:${api.action}`}
                                    >
                                      {api.resource}:{api.action}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
            })}

            {filteredPages.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'לא נמצאו דפים התואמים לחיפוש' : 'אין דפים זמינים'}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>

    {/* Warning Modal for Edit Permissions */}
    <Modal
      isOpen={showEditWarningModal}
      onClose={() => {
        setShowEditWarningModal(false);
        setPendingEditPage(null);
        setConfirmationText('');
      }}
      title="אזהרה: מתן הרשאת עריכה"
      size="lg"
      closeOnBackdropClick={false}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                מתן הרשאת עריכה כולל גישה ל-APIs
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                אתה עומד לתת הרשאת <strong>עריכה</strong> לדף <strong>{pendingEditPage && pages.find(p => p.page === pendingEditPage)?.displayNameHebrew || pendingEditPage}</strong>.
              </p>
            </div>

            {/* מה זה API - הסבר בסיסי */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">
                📚 מה זה API?
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong>API (Application Programming Interface)</strong> הוא דרך שבה תוכנות מתקשרות זו עם זו. 
                במערכת שלנו, API מאפשר למשתמשים או לתוכנות אחרות לבצע פעולות במערכת דרך בקשות ממוחשבות, 
                כמו יצירת תלמיד חדש, עדכון פרטים, או מחיקת נתונים - <strong>כל זאת ללא שימוש בממשק הגרפי של האתר</strong>.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm">
                ⚠️ המשמעות של הרשאת עריכה:
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300 list-disc list-inside">
                <li>
                  <strong>גישה ל-APIs של יצירה, עדכון ומחיקה</strong> - המשתמש/תפקיד יוכל ליצור, לעדכן ולמחוק נתונים דרך ה-API, 
                  גם ללא שימוש בממשק הגרפי של האתר. זה מאפשר אוטומציה ופעולות מרובות בבת אחת.
                </li>
                <li>
                  <strong>יצירת מפתחות API</strong> - עם הרשאת עריכה לדף "מפתחות API", המשתמש יוכל ליצור מפתחות API 
                  שיאפשרו לתוכנות אחרות לגשת למערכת בשמו ולבצע פעולות לפי ההרשאות שלו.
                </li>
                <li>
                  <strong>שינויים בלתי הפיכים</strong> - פעולות מחיקה ופעולות הרסניות אחרות לא תמיד ניתנות לביטול. 
                  פעולות דרך API יכולות להתבצע במהירות גבוהה ולגרום לנזק משמעותי.
                </li>
                <li>
                  <strong>גישה לנתונים רגישים</strong> - הרשאת עריכה כוללת גישה לנתונים פרטיים ורגישים במערכת, 
                  כולל מידע אישי, פרטי משתמשים, ונתונים אקדמיים.
                </li>
                <li>
                  <strong>לוגים וניטור</strong> - כל הפעולות מתועדות במערכת SOC לניטור אבטחה, 
                  אבל זה לא מונע נזק - רק מאפשר לזהות אותו אחרי מעשה.
                </li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                <strong>שים לב:</strong> ודא שהמשתמש/תפקיד אכן צריך הרשאת עריכה. אם רק צפייה נדרשת, השתמש בהרשאת צפייה בלבד. 
                הרשאת עריכה היא הרשאה חזקה מאוד שיכולה לאפשר שינויים משמעותיים במערכת.
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2 pt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                כדי לאשר, אנא הקלד: <strong className="text-gray-900 dark:text-white">"אני מבין את האמור לעיל"</strong>
              </label>
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder='הקלד: "אני מבין את האמור לעיל"'
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditWarningModal(false);
                  setPendingEditPage(null);
                  setConfirmationText('');
                }}
              >
                ביטול
              </Button>
              <Button
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={confirmationText.trim() !== 'אני מבין את האמור לעיל'}
                onClick={async () => {
                  if (pendingEditPage && confirmationText.trim() === 'אני מבין את האמור לעיל') {
                    setShowEditWarningModal(false);
                    await handleGrantPermission(pendingEditPage, 'edit', true);
                    setPendingEditPage(null);
                    setConfirmationText('');
                  }
                }}
              >
                אני מבין - המשך
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
    </>
  );
}
