import { useState, useEffect } from 'react';
import { Plus, Check, X, UserPlus, Search, Filter, Trash2, Key, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface User {
  id: number;
  email: string;
  name?: string;
  personalNumber?: string;
  approvalStatus: string;
  needsProfileCompletion: boolean;
  createdAt: string;
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [createdUsers, setCreatedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createFormData, setCreateFormData] = useState({
    email: '',
    temporaryPassword: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, pendingRes, createdRes] = await Promise.all([
        apiClient.get('/soldiers'),
        currentUser?.isAdmin ? apiClient.get('/auth/pending') : Promise.resolve({ data: [] }),
        currentUser?.isAdmin ? apiClient.get('/auth/created') : Promise.resolve({ data: [] }),
      ]);

      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setCreatedUsers(createdRes.data);
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

  const handleReject = async (userId: number) => {
    if (!confirm('האם אתה בטוח שברצונך לדחות משתמש זה?')) return;

    try {
      await apiClient.post(`/auth/${userId}/reject`);
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה בדחיית משתמש');
    }
  };

  const handleDelete = async (userId: number, userEmail: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail}?\nפעולה זו אינה ניתנת לביטול!`)) return;

    try {
      await apiClient.delete(`/auth/${userId}`);
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה במחיקת משתמש');
    }
  };

  const handleResetPassword = async (userId: number, userEmail: string) => {
    const newPassword = prompt(`הזן סיסמה זמנית חדשה עבור ${userEmail}:\n(מינימום 8 תווים)`);
    if (!newPassword) return;

    if (newPassword.length < 8) {
      alert('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    try {
      await apiClient.post(`/auth/${userId}/reset-password`, {
        newPassword: newPassword,
      });
      alert('הסיסמה עודכנה בהצלחה');
      loadData();
    } catch (error: any) {
      alert(error.message || 'שגיאה באיפוס סיסמה');
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
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            משתמשים
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            ניהול משתמשי המערכת
          </p>
        </div>
        {currentUser?.isAdmin && (
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="shadow-sm"
          >
            <Plus className="h-4 w-4" />
            צור משתמש חדש
          </Button>
        )}
      </div>

      {/* Create User Form */}
      {showCreateForm && currentUser?.isAdmin && (
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle>צור משתמש חדש</CardTitle>
            <CardDescription>
              המשתמש יקבל סיסמה זמנית ויצטרך להשלים את הפרופיל (כולל בחירת מחלקה) בהתחברות הראשונה
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
                  <UserPlus className="h-4 w-4" />
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

      {/* Created Users */}
      {currentUser?.isAdmin && createdUsers.length > 0 && (
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              משתמשים שנוצרו (ממתינים להשלמת פרופיל)
            </CardTitle>
            <CardDescription>
              {createdUsers.length} משתמשים שנוצרו על ידי מנהל וממתינים להשלמת הפרופיל
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {createdUsers.map((createdUser) => (
                <div
                  key={createdUser.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1C1C1C]/50 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {createdUser.name || createdUser.email}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {createdUser.email}
                      <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        נוצר - ממתין להשלמת פרופיל
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(createdUser.id, createdUser.email)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Users */}
      {currentUser?.isAdmin && pendingUsers.length > 0 && (
        <Card variant="elevated" className="animate-slide-up">
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
                      {pendingUser.needsProfileCompletion && (
                        <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          צריך להשלים פרופיל
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(pendingUser.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      אישור
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(pendingUser.id)}
                    >
                      <X className="h-4 w-4" />
                      דחייה
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(pendingUser.id, pendingUser.email)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card variant="elevated" className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>כל המשתמשים</CardTitle>
              <CardDescription>
                {filteredUsers.length} משתמשים במערכת
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חפש משתמשים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                לא נמצאו משתמשים
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
                          : user.approvalStatus === 'CREATED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : user.approvalStatus === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      )}>
                        {user.approvalStatus === 'APPROVED' 
                          ? 'מאושר' 
                          : user.approvalStatus === 'CREATED'
                          ? 'נוצר'
                          : user.approvalStatus === 'PENDING'
                          ? 'ממתין'
                          : 'נדחה'}
                      </span>
                    </div>
                  </div>
                  {currentUser?.isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(user.id, user.email)}
                        className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                        title="איפוס סיסמה"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/30 border-gray-300 dark:border-gray-700"
                        title="ערוך משתמש"
                        onClick={() => {
                          // TODO: Add edit user modal/dialog
                          alert('פונקציונליות עריכה תתווסף בקרוב');
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user.id, user.email)}
                        className="bg-red-600 hover:bg-red-700"
                        title="מחק משתמש"
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
