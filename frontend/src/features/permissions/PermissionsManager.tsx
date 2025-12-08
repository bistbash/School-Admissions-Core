import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';
import { usePermissions } from './PermissionsContext';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Plus, X, Shield } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

interface PermissionsManagerProps {
  type: 'user' | 'role';
  id: number;
  name: string;
  onClose: () => void;
}

export function PermissionsManager({ type, id, name, onClose }: PermissionsManagerProps) {
  const { refreshPermissions } = usePermissions();
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [currentPermissions, setCurrentPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [id, type]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [permissionsRes, currentPermsRes] = await Promise.all([
        apiClient.get('/permissions'),
        type === 'user'
          ? apiClient.get(`/permissions/users/${id}`)
          : apiClient.get(`/roles/${id}/permissions`),
      ]);
      setAllPermissions(permissionsRes.data);
      setCurrentPermissions(currentPermsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('שגיאה בטעינת נתונים: לא ניתן לטעון את הנתונים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrant = async (permissionId: number) => {
    try {
      if (type === 'user') {
        await apiClient.post(`/permissions/users/${id}/grant`, { permissionId });
      } else {
        await apiClient.post(`/roles/${id}/permissions/grant`, { permissionId });
      }
      await refreshPermissions();
      await loadData();
      alert('הרשאה נוספה בהצלחה');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה במתן הרשאה';
      alert(`שגיאה במתן הרשאה: ${errorMessage}`);
    }
  };

  const handleRevoke = async (permissionId: number) => {
    try {
      if (type === 'user') {
        await apiClient.post(`/permissions/users/${id}/revoke`, { permissionId });
      } else {
        await apiClient.post(`/roles/${id}/permissions/revoke`, { permissionId });
      }
      await refreshPermissions();
      await loadData();
      alert('ההרשאה הוסרה בהצלחה');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהסרת הרשאה';
      alert(`שגיאה בהסרת הרשאה: ${errorMessage}`);
    }
  };

  const hasPermission = (permissionId: number) => {
    return currentPermissions.some((cp: any) => {
      const permId = cp.permissionId || cp.permission?.id;
      return permId === permissionId;
    });
  };

  const filteredPermissions = allPermissions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333333] rounded-lg shadow-xl z-50 p-6">
          <Dialog.Title className="text-xl font-semibold mb-2 text-black dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ניהול הרשאות - {name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {type === 'user' 
              ? 'הוסף או הסר הרשאות ישירות למשתמש זה'
              : 'הוסף או הסר הרשאות לתפקיד זה - כל משתמש עם התפקיד יקבל את ההרשאות אוטומטית'}
          </Dialog.Description>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="חפש הרשאות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPermissions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    לא נמצאו הרשאות
                  </p>
                ) : (
                  filteredPermissions.map((perm) => {
                    const hasPerm = hasPermission(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-black dark:text-white">{perm.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {perm.resource}.{perm.action}
                          </div>
                          {perm.description && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {perm.description}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={hasPerm ? 'destructive' : 'default'}
                          onClick={() => {
                            if (hasPerm) {
                              handleRevoke(perm.id);
                            } else {
                              handleGrant(perm.id);
                            }
                          }}
                        >
                          {hasPerm ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              הסר
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              הוסף
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-[#333333]">
            <Dialog.Close asChild>
              <Button variant="outline">סגור</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
