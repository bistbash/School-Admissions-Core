import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2, DoorOpen, Plus, Edit, Trash2, Search as SearchIcon, KeyRound, Save, Badge, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

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
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <Card variant="default">
          <CardContent className="py-12">
            <div className="text-center text-red-600 dark:text-red-400">
              שגיאה בטעינת התוכן. אנא רענן את הדף.
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <div className="space-y-12 animate-in max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white">
          ניהול משאבים
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          ניהול משתמשים, מחלקות, חדרים ותפקידים במערכת
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 dark:border-[#333333]">
        <nav className="flex gap-0.5 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150',
                activeTab === tab.id
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4" />
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
  );
}

// Users Tab Component
function UsersTab({ action }: { action?: string | null }) {
  const { user: currentUser } = useAuth();
  
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, pendingRes, deptsRes, rolesRes] = await Promise.all([
        apiClient.get('/soldiers'),
        currentUser?.isAdmin ? apiClient.get('/auth/pending') : Promise.resolve({ data: [] }),
        apiClient.get('/departments'),
        apiClient.get('/roles'),
      ]);

      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setDepartments(deptsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      {showCreateForm && currentUser?.isAdmin && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>צור משתמש חדש</CardTitle>
            <CardDescription>
              המשתמש יקבל סיסמה זמנית ויצטרך להשלים את הפרופיל בהתחברות הראשונה
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  onClick={() => setShowCreateForm(false)}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1C1C1C]/50 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
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
      {editingUser && currentUser?.isAdmin && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>ערוך משתמש</CardTitle>
            <CardDescription>
              עדכן את פרטי המשתמש {editingUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all"
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
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all"
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
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all"
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
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 transition-all"
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
                  onClick={() => setEditingUser(null)}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* View Pending User Details Modal */}
      {viewingPendingUser && currentUser?.isAdmin && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>פרטי משתמש ממתין</CardTitle>
            <CardDescription>
              צפה בפרטים המלאים של המשתמש לפני אישור או דחייה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    שם מלא
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.name || 'לא מוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    מספר אישי
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.personalNumber || 'לא מוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    כתובת אימייל
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    סוג
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.type === 'CONSCRIPT' ? 'חובה' : viewingPendingUser.type === 'PERMANENT' ? 'קבע' : 'לא מוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    מחלקה
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.department?.name || 'לא מוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    תפקיד
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.role?.name || 'לא מוגדר'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    מפקד
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {viewingPendingUser.isCommander ? 'כן' : 'לא'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    תאריך יצירה
                  </label>
                  <div className="p-2 rounded-lg border border-gray-300 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C]">
                    {new Date(viewingPendingUser.createdAt).toLocaleDateString('he-IL')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleApprove(viewingPendingUser.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  אישור
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewingPendingUser(null);
                    handleReject(viewingPendingUser.id);
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
          </CardContent>
        </Card>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && currentUser?.isAdmin && (
        <Card variant="default" className="animate-slide-up border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              איפוס סיסמה
            </CardTitle>
            <CardDescription>
              הגדר סיסמה חדשה למשתמש. המשתמש יצטרך להחליף את הסיסמה בהתחברות הבאה.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card variant="default" className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>כל המשתמשים</CardTitle>
              <CardDescription>
                {filteredUsers.length} מתוך {users.length} משתמשים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש משתמשים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              {currentUser?.isAdmin && (
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                  <Plus className="h-4 w-4" />
                  משתמש חדש
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'לא נמצאו משתמשים התואמים לחיפוש' : 'לא נמצאו משתמשים'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262626]/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {user.name || user.email}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {user.email}
                      <span className={cn(
                        'mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        user.approvalStatus === 'APPROVED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      )}>
                        {user.approvalStatus === 'APPROVED' ? 'מאושר' : 'ממתין'}
                      </span>
                    </div>
                  </div>
                  {currentUser?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowResetPassword(user.id)}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

// Departments Tab Component
function DepartmentsTab({ action }: { action?: string | null }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(action === 'create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

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
      const response = await apiClient.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>{editingId ? 'ערוך מחלקה' : 'צור מחלקה חדשה'}</CardTitle>
            <CardDescription>
              {editingId ? 'עדכן את פרטי המחלקה' : 'הוסף מחלקה חדשה למערכת'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Card variant="default" className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>מחלקות</CardTitle>
              <CardDescription>
                {filteredDepartments.length} מתוך {departments.length} מחלקות במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש מחלקות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              {user?.isAdmin && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4" />
                  מחלקה חדשה
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDepartments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'לא נמצאו מחלקות התואמות לחיפוש' : 'אין מחלקות במערכת'}
              </div>
            ) : (
              filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262626]/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {dept.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {dept.soldiers?.length || 0} משתמשים
                    </div>
                  </div>
                  {user?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(dept)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
  const { user } = useAuth();

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
      const response = await apiClient.get('/rooms');
      setRooms(response.data);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>{editingId ? 'ערוך חדר' : 'צור חדר חדש'}</CardTitle>
            <CardDescription>
              {editingId ? 'עדכן את פרטי החדר' : 'הוסף חדר חדש למערכת'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Card variant="default" className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>חדרים</CardTitle>
              <CardDescription>
                {filteredRooms.length} מתוך {rooms.length} חדרים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש חדרים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              {user?.isAdmin && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4" />
                  חדר חדש
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'לא נמצאו חדרים התואמים לחיפוש' : 'אין חדרים במערכת. הוסף חדר חדש כדי להתחיל.'}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262626]/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {room.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      קיבולת: {room.capacity} תלמידים
                    </div>
                  </div>
                  {user?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(room)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
  const { user } = useAuth();

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
      const response = await apiClient.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to load roles:', error);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <Card variant="default" className="animate-slide-up">
          <CardHeader>
            <CardTitle>{editingId ? 'ערוך תפקיד' : 'צור תפקיד חדש'}</CardTitle>
            <CardDescription>
              {editingId ? 'עדכן את פרטי התפקיד' : 'הוסף תפקיד חדש למערכת'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Card variant="default" className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>תפקידים</CardTitle>
              <CardDescription>
                {filteredRoles.length} מתוך {roles.length} תפקידים במערכת
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="חפש תפקידים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              {user?.isAdmin && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4" />
                  תפקיד חדש
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRoles.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'לא נמצאו תפקידים התואמים לחיפוש' : 'אין תפקידים במערכת'}
              </div>
            ) : (
              filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262626]/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {role.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {role.soldiers?.length || 0} משתמשים
                    </div>
                  </div>
                  {user?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
