import React, { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { useAuth } from './AuthContext';
import { saveRedirect } from './redirect';

export function CompleteProfilePage() {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    personalNumber: '',
    name: '',
    type: 'CONSCRIPT' as 'CONSCRIPT' | 'PERMANENT',
    departmentId: '',
    roleId: '',
    isCommander: false,
    newPassword: '',
    confirmPassword: '',
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, departmentsRes] = await Promise.all([
          apiClient.get('/roles'),
          apiClient.get('/departments'),
        ]);
        setRoles(rolesRes.data);
        setDepartments(departmentsRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/complete-profile', {
        personalNumber: formData.personalNumber,
        name: formData.name,
        type: formData.type,
        departmentId: Number(formData.departmentId),
        roleId: formData.roleId ? Number(formData.roleId) : undefined,
        isCommander: formData.isCommander,
        newPassword: formData.newPassword,
      });

      // Profile completed successfully - status is now PENDING
      // User will need to wait for admin approval
      // Save current redirect (if any) before logging out
      // The redirect will be used after admin approval and re-login
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/complete-profile') {
        saveRedirect(currentPath, window.location.search);
      }
      
      alert('הפרופיל הושלם בהצלחה! החשבון שלך ממתין לאישור מנהל. תתבקש להתחבר שוב לאחר האישור.');
      logout();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת הפרופיל');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#000000] px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
              <User className="h-5 w-5 text-white dark:text-black" />
            </div>
            <div>
              <CardTitle>השלמת פרופיל</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                אנא מלא את הפרטים הבאים כדי להשלים את ההרשמה
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="מספר אישי"
                value={formData.personalNumber}
                onChange={(e) => setFormData({ ...formData, personalNumber: e.target.value })}
                required
              />

              <Input
                label="שם מלא"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  מחלקה
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  סוג
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'CONSCRIPT' | 'PERMANENT' })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  required
                >
                  <option value="CONSCRIPT">חובה</option>
                  <option value="PERMANENT">קבע</option>
                </select>
              </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  תפקיד
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#1F1F1F] bg-white dark:bg-[#080808] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="">בחר תפקיד</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCommander"
                checked={formData.isCommander}
                onChange={(e) => setFormData({ ...formData, isCommander: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black dark:focus:ring-white"
              />
              <label htmlFor="isCommander" className="text-sm text-gray-700 dark:text-gray-300">
                מפקד
              </label>
            </div>

            <div className="border-t border-gray-200 dark:border-[#1F1F1F] pt-4">
              <h3 className="text-sm font-medium mb-4 text-gray-900 dark:text-gray-100">
                החלפת סיסמה
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="password"
                  label="סיסמה חדשה"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                  minLength={8}
                />

                <Input
                  type="password"
                  label="אישור סיסמה"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 ml-2" />
              שמור פרופיל
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
