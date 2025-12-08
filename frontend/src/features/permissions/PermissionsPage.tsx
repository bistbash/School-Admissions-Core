import { useState, useEffect } from 'react';
import { apiClient } from '../../shared/lib/api';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from './PermissionsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Shield, User, Users, Plus, X } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}


interface Role {
  id: number;
  name: string;
  rolePermissions?: Array<{
    id: number;
    permission: Permission;
  }>;
}

export function PermissionsPage() {
  const { user } = useAuth();
  const { permissions, refreshPermissions } = usePermissions();
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [permissionsRes, rolesRes, usersRes] = await Promise.all([
        apiClient.get('/permissions'),
        apiClient.get('/roles'),
        apiClient.get('/soldiers'),
      ]);
      setAllPermissions(permissionsRes.data);
      setRoles(rolesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantUserPermission = async (userId: number, permissionId: number) => {
    try {
      await apiClient.post(`/permissions/users/${userId}/grant`, { permissionId });
      await refreshPermissions();
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to grant permission');
    }
  };

  const handleRevokeUserPermission = async (userId: number, permissionId: number) => {
    try {
      await apiClient.post(`/permissions/users/${userId}/revoke`, { permissionId });
      await refreshPermissions();
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to revoke permission');
    }
  };

  const handleGrantRolePermission = async (roleId: number, permissionId: number) => {
    try {
      await apiClient.post(`/roles/${roleId}/permissions/grant`, { permissionId });
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to grant permission');
    }
  };

  const handleRevokeRolePermission = async (roleId: number, permissionId: number) => {
    try {
      await apiClient.post(`/roles/${roleId}/permissions/revoke`, { permissionId });
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to revoke permission');
    }
  };

  const getUserPermissions = async (userId: number) => {
    try {
      const response = await apiClient.get(`/permissions/users/${userId}`);
      return response.data;
    } catch (error) {
      return [];
    }
  };

  const getRolePermissions = async (roleId: number) => {
    try {
      const response = await apiClient.get(`/roles/${roleId}/permissions`);
      return response.data;
    } catch (error) {
      return [];
    }
  };

  const filteredPermissions = allPermissions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          ניהול הרשאות
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ניהול הרשאות למשתמשים ותפקידים
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {/* My Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                ההרשאות שלי
              </CardTitle>
              <CardDescription>
                כל ההרשאות שלך (ישירות ומתפקיד)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">אין הרשאות</p>
                ) : (
                  permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                    >
                      <div>
                        <div className="font-medium text-black dark:text-white">{perm.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {perm.resource}.{perm.action}
                          {perm.source === 'role' && perm.role && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              (מתפקיד: {perm.role.name})
                            </span>
                          )}
                        </div>
                      </div>
                      {perm.source === 'role' && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          מתפקיד
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                הרשאות תפקידים
              </CardTitle>
              <CardDescription>
                הגדר הרשאות לכל התפקידים - כל משתמש עם התפקיד יקבל את ההרשאות אוטומטית
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {roles.map((role) => (
                    <Button
                      key={role.id}
                      variant={selectedRole === role.id ? 'default' : 'outline'}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      {role.name}
                    </Button>
                  ))}
                </div>

                {selectedRole && (
                  <RolePermissionsManager
                    roleId={selectedRole}
                    roleName={roles.find(r => r.id === selectedRole)?.name || ''}
                    allPermissions={filteredPermissions}
                    onGrant={handleGrantRolePermission}
                    onRevoke={handleRevokeRolePermission}
                    onLoadPermissions={getRolePermissions}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Permissions Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                הרשאות משתמשים
              </CardTitle>
              <CardDescription>
                הוסף הרשאות ישירות למשתמשים ספציפיים
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {users.map((u) => (
                    <Button
                      key={u.id}
                      variant={selectedUser === u.id ? 'default' : 'outline'}
                      onClick={() => setSelectedUser(u.id)}
                    >
                      {u.name || u.email}
                    </Button>
                  ))}
                </div>

                {selectedUser && (
                  <UserPermissionsManager
                    userId={selectedUser}
                    userName={users.find(u => u.id === selectedUser)?.name || users.find(u => u.id === selectedUser)?.email || ''}
                    allPermissions={filteredPermissions}
                    onGrant={handleGrantUserPermission}
                    onRevoke={handleRevokeUserPermission}
                    onLoadPermissions={getUserPermissions}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Permissions List */}
          <Card>
            <CardHeader>
              <CardTitle>כל ההרשאות במערכת</CardTitle>
              <CardDescription>
                רשימת כל ההרשאות הזמינות במערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="חפש הרשאות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                  >
                    <div>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface RolePermissionsManagerProps {
  roleId: number;
  roleName: string;
  allPermissions: Permission[];
  onGrant: (roleId: number, permissionId: number) => Promise<void>;
  onRevoke: (roleId: number, permissionId: number) => Promise<void>;
  onLoadPermissions: (roleId: number) => Promise<any[]>;
}

function RolePermissionsManager({
  roleId,
  roleName,
  allPermissions,
  onGrant,
  onRevoke,
  onLoadPermissions,
}: RolePermissionsManagerProps) {
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [roleId]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const perms = await onLoadPermissions(roleId);
      setRolePermissions(perms);
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permissionId: number) => {
    return rolePermissions.some((rp: any) => rp.permissionId === permissionId);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">טוען...</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-black dark:text-white">הרשאות עבור: {roleName}</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allPermissions.map((perm) => {
          const hasPerm = hasPermission(perm.id);
          return (
            <div
              key={perm.id}
              className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
            >
              <div>
                <div className="font-medium text-black dark:text-white">{perm.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {perm.resource}.{perm.action}
                </div>
              </div>
              <Button
                size="sm"
                variant={hasPerm ? 'destructive' : 'default'}
                onClick={() => {
                  if (hasPerm) {
                    onRevoke(roleId, perm.id).then(() => loadPermissions());
                  } else {
                    onGrant(roleId, perm.id).then(() => loadPermissions());
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
        })}
      </div>
    </div>
  );
}

interface UserPermissionsManagerProps {
  userId: number;
  userName: string;
  allPermissions: Permission[];
  onGrant: (userId: number, permissionId: number) => Promise<void>;
  onRevoke: (userId: number, permissionId: number) => Promise<void>;
  onLoadPermissions: (userId: number) => Promise<any[]>;
}

function UserPermissionsManager({
  userId,
  userName,
  allPermissions,
  onGrant,
  onRevoke,
  onLoadPermissions,
}: UserPermissionsManagerProps) {
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [userId]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const perms = await onLoadPermissions(userId);
      setUserPermissions(perms);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permissionId: number) => {
    return userPermissions.some((up: any) => up.permissionId === permissionId && up.source === 'user');
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">טוען...</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-black dark:text-white">הרשאות עבור: {userName}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        הרשאות ישירות (לא כולל הרשאות מתפקיד)
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allPermissions.map((perm) => {
          const hasPerm = hasPermission(perm.id);
          return (
            <div
              key={perm.id}
              className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
            >
              <div>
                <div className="font-medium text-black dark:text-white">{perm.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {perm.resource}.{perm.action}
                </div>
              </div>
              <Button
                size="sm"
                variant={hasPerm ? 'destructive' : 'default'}
                onClick={() => {
                  if (hasPerm) {
                    onRevoke(userId, perm.id).then(() => loadPermissions());
                  } else {
                    onGrant(userId, perm.id).then(() => loadPermissions());
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
        })}
      </div>
    </div>
  );
}
