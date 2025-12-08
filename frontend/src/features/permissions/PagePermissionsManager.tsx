import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Shield, User, Users, Eye, Edit, Check, X, Search } from 'lucide-react';

interface PagePermission {
  page: string;
  displayName: string;
  description: string;
  category: string;
  viewAPIs: Array<{ resource: string; action: string; description: string }>;
  editAPIs: Array<{ resource: string; action: string; description: string }>;
  adminOnly?: boolean;
}

interface User {
  id: number;
  name?: string;
  email: string;
  isAdmin: boolean;
}

interface Role {
  id: number;
  name: string;
}

interface UserPagePermissions {
  [page: string]: {
    view: boolean;
    edit: boolean;
  };
}

export function PagePermissionsManager() {
  const { user } = useAuth();
  const [pages, setPages] = useState<PagePermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [userPagePermissions, setUserPagePermissions] = useState<UserPagePermissions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserPagePermissions(selectedUser);
    }
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pagesRes, usersRes, rolesRes] = await Promise.all([
        apiClient.get('/permissions/pages'),
        apiClient.get('/soldiers'),
        apiClient.get('/roles'),
      ]);
      setPages(pagesRes.data);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPagePermissions = async (userId: number) => {
    try {
      const response = await apiClient.get(`/permissions/users/${userId}/page-permissions`);
      setUserPagePermissions(response.data);
    } catch (error) {
      console.error('Failed to load user page permissions:', error);
      setUserPagePermissions({});
    }
  };

  const handleGrantPagePermission = async (
    userId: number,
    page: string,
    action: 'view' | 'edit'
  ) => {
    try {
      await apiClient.post(`/permissions/users/${userId}/grant-page`, { page, action });
      await loadUserPagePermissions(userId);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Failed to grant permission');
    }
  };

  const handleRevokePagePermission = async (
    userId: number,
    page: string,
    action: 'view' | 'edit'
  ) => {
    try {
      await apiClient.post(`/permissions/users/${userId}/revoke-page`, { page, action });
      await loadUserPagePermissions(userId);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Failed to revoke permission');
    }
  };

  const handleGrantRolePagePermission = async (
    roleId: number,
    page: string,
    action: 'view' | 'edit'
  ) => {
    try {
      await apiClient.post(`/permissions/roles/${roleId}/grant-page`, { page, action });
      alert('Permission granted to role successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Failed to grant permission');
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(pages.map((p) => p.category)));

  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 dark:text-gray-400">
              אין לך הרשאה לגשת לדף זה
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white flex items-center gap-2">
          <Shield className="h-6 w-6" />
          ניהול הרשאות דפים
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ניהול הרשאות דפים - כאשר נותנים הרשאה לדף, ניתנות אוטומטית הרשאות ל-APIs המתאימים
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-[#333333]">
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('users');
            setSelectedUser(null);
            setSelectedRole(null);
          }}
        >
          <User className="h-4 w-4 mr-2" />
          משתמשים
        </Button>
        <Button
          variant={activeTab === 'roles' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('roles');
            setSelectedUser(null);
            setSelectedRole(null);
          }}
        >
          <Users className="h-4 w-4 mr-2" />
          תפקידים
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {activeTab === 'users' ? (
            <>
              {/* User Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>בחר משתמש</CardTitle>
                  <CardDescription>בחר משתמש כדי לנהל את הרשאות הדפים שלו</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {users.map((u) => (
                      <Button
                        key={u.id}
                        variant={selectedUser === u.id ? 'default' : 'outline'}
                        onClick={() => setSelectedUser(u.id)}
                      >
                        {u.name || u.email}
                        {u.isAdmin && (
                          <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Page Permissions for Selected User */}
              {selectedUser && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      הרשאות דפים עבור: {users.find((u) => u.id === selectedUser)?.name || users.find((u) => u.id === selectedUser)?.email}
                    </CardTitle>
                    <CardDescription>
                      בחר הרשאות לדפים - הרשאות ל-APIs יינתנו אוטומטית
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input
                        placeholder="חפש דפים..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
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
                                const hasView = userPagePermissions[page.page]?.view || false;
                                const hasEdit = userPagePermissions[page.page]?.edit || false;

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
                                            handleRevokePagePermission(selectedUser, page.page, 'view');
                                          } else {
                                            handleGrantPagePermission(selectedUser, page.page, 'view');
                                          }
                                        }}
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
                                        disabled={page.adminOnly && !users.find((u) => u.id === selectedUser)?.isAdmin}
                                        onClick={() => {
                                          if (hasEdit) {
                                            handleRevokePagePermission(selectedUser, page.page, 'edit');
                                          } else {
                                            handleGrantPagePermission(selectedUser, page.page, 'edit');
                                          }
                                        }}
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
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              {/* Role Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>בחר תפקיד</CardTitle>
                  <CardDescription>בחר תפקיד כדי לנהל את הרשאות הדפים שלו</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {roles.map((r) => (
                      <Button
                        key={r.id}
                        variant={selectedRole === r.id ? 'default' : 'outline'}
                        onClick={() => setSelectedRole(r.id)}
                      >
                        {r.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Page Permissions for Selected Role */}
              {selectedRole && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      הרשאות דפים עבור: {roles.find((r) => r.id === selectedRole)?.name}
                    </CardTitle>
                    <CardDescription>
                      בחר הרשאות לדפים - כל משתמש עם התפקיד יקבל את ההרשאות אוטומטית
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input
                        placeholder="חפש דפים..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
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
                              {categoryPages.map((page) => (
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
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        handleGrantRolePagePermission(selectedRole, page.page, 'view');
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      אפשר צפייה
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        handleGrantRolePagePermission(selectedRole, page.page, 'edit');
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      אפשר עריכה
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
