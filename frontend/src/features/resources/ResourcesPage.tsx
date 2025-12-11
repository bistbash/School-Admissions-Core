import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2, DoorOpen, Plus, Edit, Trash2, Search as SearchIcon, KeyRound, Save, Badge, Eye, Shield, UserCheck, Clock, CheckCircle2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Modal } from '../../shared/ui/Modal';
import { apiClient } from '../../shared/lib/api';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../../shared/lib/utils';
import { PermissionManagerModal } from './PermissionManagerModal';
import { PageWrapper } from '../../shared/components/PageWrapper';
import { usePageMode } from '../permissions/PageModeContext';

type Tab = 'users' | 'departments' | 'rooms' | 'roles';

export function ResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const actionParam = searchParams.get('action');
  
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && ['users', 'departments', 'rooms', 'roles'].includes(tabParam) ? tabParam : 'users');

  const tabs = [
    { id: 'users' as Tab, label: 'משתמשים', icon: Users },
    { id: 'departments' as Tab, label: 'מחלקות', icon: Building2 },
    { id: 'rooms' as Tab, label: 'חדרים', icon: DoorOpen },
    { id: 'roles' as Tab, label: 'תפקידים', icon: Badge },
  ];

  // Handle tab change from URL params
  useEffect(() => {
    if (tabParam && ['users', 'departments', 'rooms', 'roles'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'users':
          return <UsersTab action={actionParam} />;
        case 'departments':
          return <DepartmentsTab action={actionParam} />;
        case 'rooms':
          return <RoomsTab action={actionParam} />;
        case 'roles':
          return <RolesTab action={actionParam} />;
        default:
          return <UsersTab action={actionParam} />;
      }
    } catch (error: any) {
      console.error('Error rendering tab content:', error);
      return (
        <Card variant="default">
          <CardContent className="py-12">
            <div className="text-center text-red-600 dark:text-red-400">
              שגיאה בטעינת התוכן: {error?.message || 'שגיאה לא ידועה'}
              <br />
              אנא רענן את הדף.
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-2 sm:space-y-4 lg:space-y-6 animate-in max-w-7xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Shield className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-700 dark:text-gray-300" />
            </div>
            ניהול משאבים
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">
            ניהול משתמשים, מחלקות, חדרים ותפקידים במערכת
          </p>
        </div>

      {/* Tabs - Mobile optimized */}
      <div className="border-b border-gray-200 dark:border-[#1F1F1F] overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
        <nav className="flex gap-0 -mb-px min-w-max sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-semibold text-xs sm:text-sm transition-colors duration-150 relative whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

        {/* Tab Content */}
        <div className="animate-slide-up">
          {renderTabContent()}
        </div>
      </div>
    </PageWrapper>
  );
}

// Users Tab Component
function UsersTab({ action }: { action?: string | null }) {
  const { user: currentUser } = useAuth();
  const { mode } = usePageMode();
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [searchQuery, setSearchQuery] = useState('');
  const [createFormData, setCreateFormData] = useState({
    email: '',
    temporaryPassword: '',
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<number | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewingPendingUser, setViewingPendingUser] = useState<any | null>(null);
  const [permissionManagerOpen, setPermissionManagerOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, pendingRes, deptsRes, rolesRes] = await Promise.all([
        apiClient.get('/soldiers').catch(err => {
          console.error('Failed to load soldiers:', err);
          return { data: [] };
        }),
        currentUser?.isAdmin ? apiClient.get('/auth/pending').catch(err => {
          console.error('Failed to load pending users:', err);
          return { data: [] };
        }) : Promise.resolve({ data: [] }),
        apiClient.get('/departments').catch(err => {
          console.error('Failed to load departments:', err);
          return { data: [] };
        }),
        apiClient.get('/roles').catch(err => {
          console.error('Failed to load roles:', err);
          return { data: [] };
        }),
      ]);

      setUsers(usersRes.data || []);
      setPendingUsers(pendingRes.data || []);
      setDepartments(deptsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set empty arrays to prevent crashes
      setUsers([]);
      setPendingUsers([]);
      setDepartments([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await apiClient.post('/auth/create-user', {
        email: createFormData.email,
        temporaryPassword: createFormData.temporaryPassword,
      });

      setShowCreateForm(false);
      setCreateFormData({ email: '', temporaryPassword: '' });
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה ביצירת משתמש');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await apiClient.post(`/auth/${userId}/approve`);
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה באישור משתמש');
    }
  };

  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail}?\nפעולה זו אינה ניתנת לביטול!`)) return;

    try {
      await apiClient.delete(`/auth/${userId}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'שגיאה במחיקת משתמש');
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('האם אתה בטוח שברצונך לדחות משתמש זה?')) return;

    try {
      await apiClient.post(`/auth/${userId}/reject`);
      alert('נסה שוב, הסר משתמש');
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה בדחיית משתמש');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      personalNumber: user.personalNumber || '',
      email: user.email || '',
      type: user.type || 'CONSCRIPT',
      departmentId: user.departmentId || '',
      roleId: user.roleId || '',
      isCommander: user.isCommander || false,
      isAdmin: user.isAdmin || false,
      approvalStatus: user.approvalStatus || 'PENDING',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      // Build update payload - only include fields that have values
      const updatePayload: any = {};
      
      if (editFormData.name) updatePayload.name = editFormData.name;
      if (editFormData.personalNumber) updatePayload.personalNumber = editFormData.personalNumber;
      if (editFormData.email) updatePayload.email = editFormData.email;
      if (editFormData.type) updatePayload.type = editFormData.type;
      if (editFormData.departmentId) updatePayload.departmentId = Number(editFormData.departmentId);
      if (editFormData.roleId !== '' && editFormData.roleId !== null) {
        updatePayload.roleId = editFormData.roleId ? Number(editFormData.roleId) : null;
      }
      updatePayload.isCommander = editFormData.isCommander || false;
      updatePayload.isAdmin = editFormData.isAdmin || false;
      if (editFormData.approvalStatus) updatePayload.approvalStatus = editFormData.approvalStatus;

      await apiClient.put(`/auth/${editingUser.id}`, updatePayload);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      console.error('Update user error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בעדכון משתמש';
      if (error.response?.status === 404) {
        alert('השרת לא זמין או שה-endpoint לא נמצא. אנא ודא שהשרת רץ.');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPassword) return;

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      alert('הסיסמאות אינן תואמות');
      return;
    }

    if (resetPasswordData.newPassword.length < 8) {
      alert('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiClient.post(`/auth/${showResetPassword}/reset-password`, {
        newPassword: resetPasswordData.newPassword,
      });
      setShowResetPassword(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
      alert('הסיסמה אופסה בהצלחה');
    } catch (error: any) {
      alert(error.message || 'שגיאה באיפוס סיסמה');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.personalNumber?.toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    approved: users.filter(u => u.approvalStatus === 'APPROVED').length,
    pending: pendingUsers.length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards - Hidden on mobile */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md transition-shadow duration-100 bg-white dark:bg-[#080808]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  סה"כ משתמשים
                </p>
                <p className="text-3xl font-semibold text-black dark:text-white tracking-tight">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Users className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md transition-shadow duration-100 bg-white dark:bg-[#080808]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  משתמשים מאושרים
                </p>
                <p className="text-3xl font-semibold text-black dark:text-white tracking-tight">
                  {stats.approved}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CheckCircle2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-[#1F1F1F] hover:shadow-md transition-shadow duration-100 bg-white dark:bg-[#080808]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  ממתינים לאישור
                </p>
                <p className="text-3xl font-semibold text-black dark:text-white tracking-tight">
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateForm && currentUser?.isAdmin && mode === 'edit'}
        onClose={() => {
          setShowCreateForm(false);
          setCreateFormData({ email: '', temporaryPassword: '' });
        }}
        title="צור משתמש חדש"
        subtitle="המשתמש יקבל סיסמה זמנית ויצטרך להשלים את הפרופיל בהתחברות הראשונה"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            type="email"
            label="כתובת אימייל"
            value={createFormData.email}
            onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
            required
            placeholder="user@example.com"
          />
          <Input
            type="password"
            label="סיסמה זמנית"
            value={createFormData.temporaryPassword}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, temporaryPassword: e.target.value })
            }
            required
            minLength={8}
            helperText="מינימום 8 תווים"
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isCreating} className="flex-1">
              <Plus className="h-4 w-4" />
              צור משתמש
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setCreateFormData({ email: '', temporaryPassword: '' });
              }}
            >
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pending Users */}
      {currentUser?.isAdmin && pendingUsers.length > 0 && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              משתמשים ממתינים לאישור
            </CardTitle>
            <CardDescription>
              {pendingUsers.length} משתמשים ממתינים לאישור מנהל
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#1F1F1F] rounded-lg bg-gray-50 dark:bg-[#080808]/50 hover:bg-gray-100 dark:hover:bg-[#141414] transition-colors duration-100"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {pendingUser.name || pendingUser.email}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {pendingUser.email}
                      {pendingUser.personalNumber && (
                        <span className="mr-2">• מספר אישי: {pendingUser.personalNumber}</span>
                      )}
                      {pendingUser.department && (
                        <span className="mr-2">• מחלקה: {pendingUser.department.name}</span>
                      )}
                      {pendingUser.type && (
                        <span className="mr-2">• סוג: {pendingUser.type === 'CONSCRIPT' ? 'חובה' : 'קבע'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingPendingUser(pendingUser)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(pendingUser.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      אישור
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(pendingUser.id)}
                    >
                      דחייה
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser && currentUser?.isAdmin}
        onClose={() => {
          setEditingUser(null);
          setEditFormData({
            name: '',
            email: '',
            personalNumber: '',
            type: 'CONSCRIPT',
            departmentId: '',
            roleId: '',
          });
        }}
        title="ערוך משתמש"
        subtitle={editingUser ? `עדכן את פרטי המשתמש ${editingUser.email}` : ''}
        size="lg"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="שם מלא"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="שם המשתמש"
                />
                <Input
                  label="מספר אישי"
                  value={editFormData.personalNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, personalNumber: e.target.value })}
                  placeholder="מספר אישי"
                />
              </div>
              <Input
                type="email"
                label="כתובת אימייל"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    סוג
                  </label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all duration-100"
                  >
                    <option value="CONSCRIPT">חובה</option>
                    <option value="PERMANENT">קבע</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    מחלקה
                  </label>
                  <select
                    value={editFormData.departmentId}
                    onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all duration-100"
                    required
                  >
                    <option value="">בחר מחלקה</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    תפקיד
                  </label>
                  <select
                    value={editFormData.roleId}
                    onChange={(e) => setEditFormData({ ...editFormData, roleId: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all duration-100"
                  >
                    <option value="">בחר תפקיד</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    סטטוס אישור
                  </label>
                  <select
                    value={editFormData.approvalStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, approvalStatus: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all duration-100"
                  >
                    <option value="PENDING">ממתין</option>
                    <option value="APPROVED">מאושר</option>
                    <option value="REJECTED">נדחה</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editFormData.isCommander}
                    onChange={(e) => setEditFormData({ ...editFormData, isCommander: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black dark:focus:ring-white"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">מפקד</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editFormData.isAdmin}
                    onChange={(e) => setEditFormData({ ...editFormData, isAdmin: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black dark:focus:ring-white"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">מנהל</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" isLoading={isUpdating} className="flex-1">
                  <Save className="h-4 w-4" />
                  שמור שינויים
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({
                      name: '',
                      email: '',
                      personalNumber: '',
                      type: 'CONSCRIPT',
                      departmentId: '',
                      roleId: '',
                    });
                  }}
                >
                  ביטול
                </Button>
              </div>
            </form>
      </Modal>

      {/* View Pending User Details Modal */}
      <Modal
        isOpen={!!viewingPendingUser && currentUser?.isAdmin}
        onClose={() => setViewingPendingUser(null)}
        title="פרטי משתמש ממתין"
        subtitle="צפה בפרטים המלאים של המשתמש לפני אישור או דחייה"
        size="lg"
      >
        {viewingPendingUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  שם מלא
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.name || 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  מספר אישי
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.personalNumber || 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  כתובת אימייל
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.email || 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  סוג
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.type === 'CONSCRIPT' ? 'חובה' : viewingPendingUser.type === 'PERMANENT' ? 'קבע' : 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  מחלקה
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.department?.name || 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  תפקיד
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.role?.name || 'לא מוגדר'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  מפקד
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.isCommander ? 'כן' : 'לא'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  תאריך יצירה
                </label>
                <div className="p-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#080808]">
                  {viewingPendingUser.createdAt ? new Date(viewingPendingUser.createdAt).toLocaleDateString('he-IL') : 'לא מוגדר'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => viewingPendingUser && handleApprove(viewingPendingUser.id)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                אישור
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (viewingPendingUser) {
                    handleReject(viewingPendingUser.id);
                  }
                  setViewingPendingUser(null);
                }}
                className="flex-1"
              >
                דחייה
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingPendingUser(null)}
              >
                ביטול
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!showResetPassword && currentUser?.isAdmin}
        onClose={() => {
          setShowResetPassword(null);
          setResetPasswordData({ newPassword: '', confirmPassword: '' });
        }}
        title="איפוס סיסמה"
        subtitle="הגדר סיסמה חדשה למשתמש. המשתמש יצטרך להחליף את הסיסמה בהתחברות הבאה."
        size="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="password"
                label="סיסמה חדשה"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                required
                minLength={8}
                placeholder="מינימום 8 תווים"
              />
              <Input
                type="password"
                label="אישור סיסמה"
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                required
                minLength={8}
                placeholder="הזן שוב את הסיסמה"
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" isLoading={isResettingPassword} className="flex-1">
                  <KeyRound className="h-4 w-4" />
                  אפס סיסמה
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowResetPassword(null);
                    setResetPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                >
                  ביטול
                </Button>
              </div>
            </form>
      </Modal>

      {/* All Users */}
      <Card variant="default" className="animate-slide-up border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
        <CardHeader className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-[#1F1F1F] px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">כל המשתמשים</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {filteredUsers.length} מתוך {users.length} משתמשים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש משתמשים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9"
                />
              </div>
              {currentUser?.isAdmin && mode === 'edit' && (
                <Button 
                  size="sm"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="h-7 w-7 sm:h-10 sm:w-10 p-0 flex-shrink-0"
                  title="משתמש חדש"
                >
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {searchQuery ? 'לא נמצאו משתמשים התואמים לחיפוש' : 'לא נמצאו משתמשים'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg hover:shadow-sm active:scale-[0.98] transition-all duration-150",
                    index === 0 && "mt-2 sm:mt-3"
                  )}
                >
                  {/* Left side - Status badge (always visible) */}
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded text-[10px] sm:text-xs font-semibold border flex-shrink-0',
                    user.approvalStatus === 'APPROVED'
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  )}>
                    {user.approvalStatus === 'APPROVED' ? 'מאושר' : 'ממתין'}
                  </span>
                  
                  {/* Center - User info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold sm:font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {user.name || 'רישום'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                      {user.email}
                      {user.personalNumber && (
                        <span className="mr-2 text-gray-500">• {user.personalNumber}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right side - Action buttons + User icon */}
                  <div className="flex items-center gap-2 flex-shrink-0 relative">
                    {/* Action buttons - Desktop: hover, Mobile: dropdown menu */}
                    {currentUser?.isAdmin && mode === 'edit' && currentUser.id !== user.id && (
                      <>
                        {/* Desktop: Individual buttons on hover */}
                        <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserForPermissions(user);
                              setPermissionManagerOpen(true);
                            }}
                            className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="אבטחה"
                          >
                            <Shield className="h-5 w-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="ערוך"
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowResetPassword(user.id)}
                            className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="איפוס סיסמה"
                          >
                            <KeyRound className="h-5 w-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="h-9 w-9 p-0"
                            title="מחק"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>

                        {/* Mobile: Dropdown menu button */}
                        <div className="sm:hidden relative">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenu(openActionMenu === user.id ? null : user.id);
                            }}
                            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 rounded-lg"
                            title="פעולות"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {/* Dropdown menu */}
                          {openActionMenu === user.id && (
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenu(null);
                                }}
                              />
                              {/* Menu */}
                              <div className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                                <button
                                  onClick={() => {
                                    setSelectedUserForPermissions(user);
                                    setPermissionManagerOpen(true);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b border-gray-200 dark:border-[#1F1F1F]"
                                >
                                  <Shield className="h-4 w-4 flex-shrink-0" />
                                  <span>אבטחה</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditUser(user);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b border-gray-200 dark:border-[#1F1F1F]"
                                >
                                  <Edit className="h-4 w-4 flex-shrink-0" />
                                  <span>ערוך</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setShowResetPassword(user.id);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 border-b border-gray-200 dark:border-[#1F1F1F]"
                                >
                                  <KeyRound className="h-4 w-4 flex-shrink-0" />
                                  <span>איפוס סיסמה</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteUser(user.id, user.email);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3"
                                >
                                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                                  <span>מחק</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    
                    {/* User icon - always visible */}
                    <div className="p-1.5 sm:p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      {user.approvalStatus === 'APPROVED' ? (
                        <UserCheck className="h-4 w-4 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
                      ) : (
                        <Clock className="h-4 w-4 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission Manager Modal */}
      {selectedUserForPermissions && permissionManagerOpen && (
        <PermissionManagerModal
          isOpen={permissionManagerOpen}
          onClose={() => {
            setPermissionManagerOpen(false);
            setSelectedUserForPermissions(null);
          }}
          type="user"
          targetId={selectedUserForPermissions.id}
          targetName={selectedUserForPermissions?.name || selectedUserForPermissions?.email || 'משתמש'}
        />
      )}
    </div>
  );
}

// Departments Tab Component
function DepartmentsTab({ action }: { action?: string | null }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const { user } = useAuth();
  const { mode } = usePageMode();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await apiClient.put(`/departments/${editingId}`, formData);
      } else {
        await apiClient.post('/departments', formData);
      }
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({ name: '' });
      loadDepartments();
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (dept: any) => {
    setEditingId(dept.id);
    setFormData({ name: dept.name });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מחלקה זו?')) return;

    try {
      await apiClient.delete(`/departments/${id}`);
      loadDepartments();
    } catch (error: any) {
      alert(error.message || 'שגיאה במחיקה');
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    const query = searchQuery.toLowerCase();
    return dept.name.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={showCreateForm && mode === 'edit'}
        onClose={() => {
          setShowCreateForm(false);
          setEditingId(null);
          setFormData({ name: '' });
        }}
        title={editingId ? 'ערוך מחלקה' : 'צור מחלקה חדשה'}
        subtitle={editingId ? 'עדכן את פרטי המחלקה' : 'הוסף מחלקה חדשה למערכת'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="שם המחלקה"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            required
            placeholder="לדוגמה: מחלקת לוגיסטיקה"
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              <Plus className="h-4 w-4" />
              {editingId ? 'עדכן' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setEditingId(null);
                setFormData({ name: '' });
              }}
            >
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      <Card variant="default" className="animate-slide-up border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
        <CardHeader className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-[#1F1F1F] px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">מחלקות</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {filteredDepartments.length} מתוך {departments.length} מחלקות במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש מחלקות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm rounded-lg"
                />
              </div>
              {user?.isAdmin && mode === 'edit' && (
                <Button 
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="h-7 w-7 sm:h-10 sm:w-10 p-0 flex-shrink-0"
                  title="מחלקה חדשה"
                >
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {filteredDepartments.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {searchQuery ? 'לא נמצאו מחלקות התואמות לחיפוש' : 'אין מחלקות במערכת'}
                </p>
              </div>
            ) : (
              filteredDepartments.map((dept, index) => (
                <div
                  key={dept.id}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg hover:shadow-sm active:scale-[0.98] transition-all duration-150",
                    index === 0 && "mt-2 sm:mt-3"
                  )}
                >
                  {/* Left side - Department icon */}
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  
                  {/* Center - Department info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold sm:font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {dept.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {dept.soldiers?.length || 0} משתמשים
                    </div>
                  </div>
                  
                  {/* Right side - Action buttons */}
                  {user?.isAdmin && mode === 'edit' && (
                    <div className="flex items-center gap-2 flex-shrink-0 relative">
                      {/* Desktop: Individual buttons on hover */}
                      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(dept)}
                          className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="ערוך"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(dept.id)}
                          className="h-9 w-9 p-0"
                          title="מחק"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Mobile: Dropdown menu button */}
                      <div className="sm:hidden relative">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === dept.id ? null : dept.id);
                          }}
                          className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 rounded-lg"
                          title="פעולות"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {/* Dropdown menu */}
                        {openActionMenu === dept.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(null);
                              }}
                            />
                            <div className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-2xl shadow-lg min-w-[160px] overflow-hidden">
                              <button
                                onClick={() => {
                                  handleEdit(dept);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 border-b border-gray-200 dark:border-[#1F1F1F]"
                              >
                                <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>ערוך</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(dept.id);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>מחק</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Rooms Tab Component
function RoomsTab({ action }: { action?: string | null }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const { user } = useAuth();
  const { mode } = usePageMode();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/rooms');
      setRooms(response.data || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await apiClient.put(`/rooms/${editingId}`, {
          name: formData.name,
          capacity: Number(formData.capacity),
        });
      } else {
        await apiClient.post('/rooms', {
          name: formData.name,
          capacity: Number(formData.capacity),
        });
      }
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        capacity: '',
      });
      loadRooms();
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (room: any) => {
    setEditingId(room.id);
    setFormData({
      name: room.name,
      capacity: room.capacity.toString(),
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) return;

    try {
      await apiClient.delete(`/rooms/${id}`);
      loadRooms();
    } catch (error: any) {
      alert(error.message || 'שגיאה במחיקה');
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) ||
      room.capacity.toString().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={showCreateForm && mode === 'edit'}
        onClose={() => {
          setShowCreateForm(false);
          setEditingId(null);
          setFormData({
            name: '',
            capacity: '',
          });
        }}
        title={editingId ? 'ערוך חדר' : 'צור חדר חדש'}
        subtitle={editingId ? 'עדכן את פרטי החדר' : 'הוסף חדר חדש למערכת'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="שם החדר"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="לדוגמה: חדר 101"
          />
          <Input
            type="number"
            label="קיבולת"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            required
            min="1"
            placeholder="מספר התלמידים המקסימלי"
            helperText="מספר התלמידים שיכולים להיות בחדר"
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              <Plus className="h-4 w-4" />
              {editingId ? 'עדכן' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setEditingId(null);
                setFormData({
                  name: '',
                  capacity: '',
                });
              }}
            >
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      <Card variant="default" className="animate-slide-up border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
        <CardHeader className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-[#1F1F1F] px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">חדרים</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {filteredRooms.length} מתוך {rooms.length} חדרים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש חדרים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm rounded-lg"
                />
              </div>
              {user?.isAdmin && mode === 'edit' && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="h-7 w-7 sm:h-10 sm:w-10 p-0 flex-shrink-0"
                  title="חדר חדש"
                >
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-16">
                <DoorOpen className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {searchQuery ? 'לא נמצאו חדרים התואמים לחיפוש' : 'אין חדרים במערכת. הוסף חדר חדש כדי להתחיל.'}
                </p>
              </div>
            ) : (
              filteredRooms.map((room, index) => (
                <div
                  key={room.id}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg hover:shadow-sm active:scale-[0.98] transition-all duration-150",
                    index === 0 && "mt-2 sm:mt-3"
                  )}
                >
                  {/* Left side - Room icon */}
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  
                  {/* Center - Room info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold sm:font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {room.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      קיבולת: {room.capacity} תלמידים
                    </div>
                  </div>
                  
                  {/* Right side - Action buttons */}
                  {user?.isAdmin && mode === 'edit' && (
                    <div className="flex items-center gap-2 flex-shrink-0 relative">
                      {/* Desktop: Individual buttons on hover */}
                      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(room)}
                          className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="ערוך"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(room.id)}
                          className="h-9 w-9 p-0"
                          title="מחק"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Mobile: Dropdown menu button */}
                      <div className="sm:hidden relative">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === room.id ? null : room.id);
                          }}
                          className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 rounded-lg"
                          title="פעולות"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {/* Dropdown menu */}
                        {openActionMenu === room.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(null);
                              }}
                            />
                            <div className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-2xl shadow-lg min-w-[160px] overflow-hidden">
                              <button
                                onClick={() => {
                                  handleEdit(room);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 border-b border-gray-200 dark:border-[#1F1F1F]"
                              >
                                <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>ערוך</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(room.id);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>מחק</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Roles Tab Component
function RolesTab({ action }: { action?: string | null }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionManagerOpen, setPermissionManagerOpen] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<any | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const { user } = useAuth();
  const { mode } = usePageMode();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/roles');
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await apiClient.put(`/roles/${editingId}`, formData);
      } else {
        await apiClient.post('/roles', formData);
      }
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({ name: '' });
      loadRoles();
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (role: any) => {
    setEditingId(role.id);
    setFormData({ name: role.name });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תפקיד זה?')) return;

    try {
      await apiClient.delete(`/roles/${id}`);
      loadRoles();
    } catch (error: any) {
      alert(error.message || 'שגיאה במחיקה');
    }
  };

  const filteredRoles = roles.filter((role) => {
    const query = searchQuery.toLowerCase();
    return role.name.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={showCreateForm && mode === 'edit'}
        onClose={() => {
          setShowCreateForm(false);
          setEditingId(null);
          setFormData({ name: '' });
        }}
        title={editingId ? 'ערוך תפקיד' : 'צור תפקיד חדש'}
        subtitle={editingId ? 'עדכן את פרטי התפקיד' : 'הוסף תפקיד חדש למערכת'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="שם התפקיד"
            value={formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            required
            placeholder="לדוגמה: מפקד מחלקה"
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              <Plus className="h-4 w-4" />
              {editingId ? 'עדכן' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setEditingId(null);
                setFormData({ name: '' });
              }}
            >
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      <Card variant="default" className="animate-slide-up border border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] rounded-2xl sm:rounded-lg">
        <CardHeader className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-[#1F1F1F] px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">תפקידים</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {filteredRoles.length} מתוך {roles.length} תפקידים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש תפקידים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-sm rounded-lg"
                />
              </div>
              {user?.isAdmin && mode === 'edit' && (
                <Button 
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="h-7 w-7 sm:h-10 sm:w-10 p-0 flex-shrink-0"
                  title="תפקיד חדש"
                >
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {filteredRoles.length === 0 ? (
              <div className="text-center py-16">
                <Badge className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {searchQuery ? 'לא נמצאו תפקידים התואמים לחיפוש' : 'אין תפקידים במערכת'}
                </p>
              </div>
            ) : (
              filteredRoles.map((role, index) => (
                <div
                  key={role.id}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg hover:shadow-sm active:scale-[0.98] transition-all duration-150",
                    index === 0 && "mt-2 sm:mt-3"
                  )}
                >
                  {/* Left side - Role icon */}
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <Badge className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  
                  {/* Center - Role info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold sm:font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {role.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {role.soldiers?.length || 0} משתמשים
                    </div>
                  </div>
                  
                  {/* Right side - Action buttons */}
                  {user?.isAdmin && mode === 'edit' && (
                    <div className="flex items-center gap-2 flex-shrink-0 relative">
                      {/* Desktop: Individual buttons on hover */}
                      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(role)}
                          className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="ערוך"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRoleForPermissions(role);
                            setPermissionManagerOpen(true);
                          }}
                          className="h-9 w-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="אבטחה"
                        >
                          <Shield className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(role.id)}
                          className="h-9 w-9 p-0"
                          title="מחק"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Mobile: Dropdown menu button */}
                      <div className="sm:hidden relative">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === role.id ? null : role.id);
                          }}
                          className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 rounded-lg"
                          title="פעולות"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {/* Dropdown menu */}
                        {openActionMenu === role.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(null);
                              }}
                            />
                            <div className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                              <button
                                onClick={() => {
                                  handleEdit(role);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 border-b border-gray-200 dark:border-[#1F1F1F]"
                              >
                                <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>ערוך</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRoleForPermissions(role);
                                  setPermissionManagerOpen(true);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 border-b border-gray-200 dark:border-[#1F1F1F]"
                              >
                                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>אבטחה</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(role.id);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full px-3 py-2 text-right text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>מחק</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission Manager Modal */}
      {selectedRoleForPermissions && permissionManagerOpen && (
        <PermissionManagerModal
          isOpen={permissionManagerOpen}
          onClose={() => {
            setPermissionManagerOpen(false);
            setSelectedRoleForPermissions(null);
          }}
          type="role"
          targetId={selectedRoleForPermissions.id}
          targetName={selectedRoleForPermissions.name}
        />
      )}
    </div>
  );
}
