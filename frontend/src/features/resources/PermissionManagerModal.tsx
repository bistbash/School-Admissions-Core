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
import { Eye, Edit, Check, Loader2 } from 'lucide-react';
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

  const handleGrantPermission = useCallback(async (page: string, action: 'view' | 'edit') => {
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
  const { filteredPages, categories } = useMemo(() => {
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

    const cats = Array.from(new Set(filtered.map((p) => p.category)));
    return { filteredPages: filtered, categories: cats };
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
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryPages = filteredPages.filter((p) => p.category === category);
              if (categoryPages.length === 0) return null;
              
              const categoryHebrew = categoryPages[0]?.categoryHebrew || category;

              return (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-semibold text-black dark:text-white pb-2 border-b border-gray-200 dark:border-[#1F1F1F]">
                    {categoryHebrew}
                  </h3>
                  
                  <div className="space-y-4">
                    {categoryPages.map((page) => {
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

                      // Get unique APIs (calculated inline, not with useMemo to avoid hook order issues)
                      let displayedAPIs: typeof page.viewAPIs = [];
                      if (hasEdit) {
                        const allAPIs = [...page.viewAPIs, ...page.editAPIs];
                        const unique = new Map<string, typeof page.viewAPIs[0]>();
                        allAPIs.forEach(api => {
                          const key = `${api.resource}:${api.action}`;
                          if (!unique.has(key)) {
                            unique.set(key, api);
                          }
                        });
                        displayedAPIs = Array.from(unique.values());
                      } else if (hasView) {
                        displayedAPIs = page.viewAPIs;
                      }

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
                                {displayedAPIs.map((api, idx) => {
                                  const isEditAPI = page.editAPIs.some(
                                    e => e.resource === api.resource && e.action === api.action
                                  );
                                  const colorClass = isEditAPI && hasEdit
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                                  
                                  return (
                                    <span
                                      key={`${api.resource}:${api.action}:${idx}`}
                                      className={cn('text-xs px-2 py-1 rounded-md font-medium border', colorClass)}
                                      title={api.descriptionHebrew || api.description}
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
                  </div>
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
  );
}
