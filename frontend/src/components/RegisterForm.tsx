import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { authStorage } from '../lib/auth';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    personalNumber: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    type: 'CONSCRIPT' as 'CONSCRIPT' | 'PERMANENT',
    departmentId: '',
    roleId: '',
    isCommander: false,
  });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          apiClient.get('/departments'),
          apiClient.get('/roles')
        ]);
        setDepartments(dRes.data);
        setRoles(rRes.data);
      } catch (e) {
        console.error("Failed to fetch dependencies", e);
      }
    };
    fetchDeps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (formData.password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setLoading(true);

    try {
      const registerData = {
        personalNumber: formData.personalNumber,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        type: formData.type,
        departmentId: Number(formData.departmentId),
        roleId: formData.roleId ? Number(formData.roleId) : undefined,
        isCommander: formData.isCommander,
      };

      const response = await apiClient.post('/auth/register', registerData);
      authStorage.setToken(response.data.token);
      onSuccess();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'שגיאה בהרשמה';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-center">הרשמה</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מספר אישי *
          </label>
          <input
            type="text"
            value={formData.personalNumber}
            onChange={(e) => setFormData({ ...formData, personalNumber: e.target.value })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם מלא *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            אימייל *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סיסמה (מינימום 8 תווים) *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={8}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            אימות סיסמה *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סוג שירות *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'CONSCRIPT' | 'PERMANENT' })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="CONSCRIPT">חובה</option>
            <option value="PERMANENT">קבע</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחלקה *
          </label>
          <select
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            required
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">בחר מחלקה</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            תפקיד
          </label>
          <select
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">בחר תפקיד (אופציונלי)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isCommander"
            checked={formData.isCommander}
            onChange={(e) => setFormData({ ...formData, isCommander: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="isCommander" className="mr-2 text-sm font-medium text-gray-700">
            האם מפקד?
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? 'נרשם...' : 'הירשם'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          יש לך חשבון? התחבר כאן
        </button>
      </div>
    </div>
  );
}


