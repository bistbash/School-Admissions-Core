import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Eye, Edit, Check, X, Search, Shield } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';

// Import PAGE_PERMISSIONS type from backend (we'll fetch it from API)

interface PagePermission {
  page: string;
  displayName: string;
  description: string;
  category: string;
  viewAPIs: Array<{ resource: string; action: string; description: string }>;
  editAPIs: Array<{ resource: string; action: string; description: string }>;
  adminOnly?: boolean;
}

interface UserPagePermissions {
  [page: string]: {
    view: boolean;
    edit: boolean;
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
  const [pages, setPages] = useState<PagePermission[]>([]);
  const [pagePermissions, setPagePermissions] = useState<UserPagePermissions>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only load data when modal is actually open
    if (isOpen && targetId) {
      loadData();
    } else {
      // Reset state when modal closes
      setPages([]);
      setPagePermissions({});
      setIsLoading(false);
      setSearchQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetId, type]);

  const loadData = async () => {
    if (!isOpen || !targetId || targetId <= 0) {
      return;
    }

    try {
      setIsLoading(true);
      const pagesRes = await apiClient.get('/permissions/pages');
      
      // Load permissions based on type
      let permissionsData: UserPagePermissions = {};
      if (type === 'user') {
        try {
          const permissionsRes = await apiClient.get(`/permissions/users/${targetId}/page-permissions`);
          permissionsData = permissionsRes.data || {};
        } catch (error: any) {
          console.warn('Failed to load user page permissions:', error);
          permissionsData = {};
        }
      } else {
        // For roles, we don't have a direct endpoint yet
        // Show empty - admin can still grant permissions
        permissionsData = {};
      }
      
      setPages(pagesRes.data || []);
      setPagePermissions(permissionsData);
    } catch (error: any) {
      console.error('Failed to load permissions:', error);
      setPages([]);
      setPagePermissions({});
      // Don't show alert - just log the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantPermission = async (page: string, action: 'view' | 'edit') => {
    try {
      setIsSaving(true);
      if (type === 'user') {
        await apiClient.post(`/permissions/users/${targetId}/grant-page`, { page, action });
      } else {
        await apiClient.post(`/permissions/roles/${targetId}/grant-page`, { page, action });
      }
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'שגיאה במתן הרשאה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokePermission = async (page: string, action: 'view' | 'edit') => {
    try {
      setIsSaving(true);
      if (type === 'user') {
        await apiClient.post(`/permissions/users/${targetId}/revoke-page`, { page, action });
      } else {
        // For roles, we might need a different endpoint
        alert('הסרת הרשאות מתפקידים עדיין לא נתמכת');
        return;
      }
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'שגיאה בהסרת הרשאה');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(pages.map((p) => p.category)));

  // Don't render anything if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ניהול הרשאות - ${targetName}`} size="xl">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-4">
          <Input
            placeholder="חפש דפים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => {
              const categoryPages = filteredPages.filter((p) => p.category === category);
              if (categoryPages.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-medium mb-3 text-black dark:text-white">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryPages.map((page) => {
                      const hasView = pagePermissions[page.page]?.view || false;
                      const hasEdit = pagePermissions[page.page]?.edit || false;

                      return (
                        <div
                          key={page.page}
                          className="p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1a1a1a]"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-black dark:text-white mb-1">
                                {page.displayName}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {page.description}
                              </p>
                              {page.adminOnly && (
                                <span className="inline-block mt-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                  רק למנהלים
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={hasView ? 'default' : 'outline'}
                              onClick={() => {
                                if (hasView) {
                                  handleRevokePermission(page.page, 'view');
                                } else {
                                  handleGrantPermission(page.page, 'view');
                                }
                              }}
                              disabled={isSaving}
                            >
                              {hasView ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  צפייה
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  אפשר צפייה
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant={hasEdit ? 'default' : 'outline'}
                              onClick={() => {
                                if (hasEdit) {
                                  handleRevokePermission(page.page, 'edit');
                                } else {
                                  handleGrantPermission(page.page, 'edit');
                                }
                              }}
                              disabled={isSaving || (page.adminOnly && type === 'role')}
                            >
                              {hasEdit ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  עריכה
                                </>
                              ) : (
                                <>
                                  <Edit className="h-4 w-4 mr-1" />
                                  אפשר עריכה
                                </>
                              )}
                            </Button>
                          </div>
                          {(hasView || hasEdit) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#333333]">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                APIs שניתנו אוטומטית:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {hasView &&
                                  page.viewAPIs.map((api, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    >
                                      {api.resource}:{api.action}
                                    </span>
                                  ))}
                                {hasEdit &&
                                  page.editAPIs.map((api, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    >
                                      {api.resource}:{api.action}
                                    </span>
                                  ))}
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
          </div>
        )}
      </div>
    </Modal>
  );
}
