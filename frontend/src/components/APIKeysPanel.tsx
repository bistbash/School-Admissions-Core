import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

interface APIKey {
  id: number;
  name: string;
  userId?: number;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateAPIKeyResponse {
  message: string;
  apiKey: {
    id: number;
    key: string;
    name: string;
    createdAt: string;
    expiresAt?: string;
  };
}

export function APIKeysPanel() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState<CreateAPIKeyResponse['apiKey'] | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [formData, setFormData] = useState({
    name: '',
    expiresAt: '',
  });

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<APIKey[]>('/api-keys');
      setKeys(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת מפתחות API');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<APIKey[]>('/api-keys/all');
      setKeys(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת מפתחות API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'my') {
      fetchKeys();
    } else {
      fetchAllKeys();
    }
  }, [viewMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const data: any = { name: formData.name };
      if (formData.expiresAt) {
        data.expiresAt = new Date(formData.expiresAt).toISOString();
      }

      const response = await apiClient.post<CreateAPIKeyResponse>('/api-keys', data);
      setNewKey(response.data.apiKey);
      setShowCreateForm(false);
      setFormData({ name: '', expiresAt: '' });
      await fetchKeys();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה ביצירת מפתח API');
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מפתח זה לצמיתות?\n\n⚠️ פעולה זו לא ניתנת לביטול - המפתח יימחק לגמרי מהמערכת!')) {
      return;
    }

    try {
      setError(null);
      await apiClient.delete(`/api-keys/${keyId}`);
      // Refresh the list to show updated data
      if (viewMode === 'my') {
        await fetchKeys();
      } else {
        await fetchAllKeys();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה במחיקת מפתח');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleString('he-IL');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">מפתחות API</h2>
          <p className="text-gray-500 mt-1">ניהול מפתחות API לגישה מאובטחת ל-API</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          צור מפתח חדש
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* New Key Display Modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
            <div className="p-6 border-b bg-yellow-50">
              <h3 className="text-xl font-bold text-gray-900">מפתח API נוצר בהצלחה!</h3>
              <p className="text-sm text-red-600 mt-1 font-semibold">
                ⚠️ שמור את המפתח הזה עכשיו - הוא לא יוצג שוב!
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם המפתח</label>
                <div className="p-2 bg-gray-50 rounded">{newKey.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מפתח API</label>
                <div className="p-3 bg-gray-900 text-green-400 font-mono text-sm rounded border-2 border-yellow-400 break-all">
                  {newKey.key}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newKey.key);
                    alert('המפתח הועתק ללוח!');
                  }}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  העתק ללוח
                </button>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>חשוב:</strong> המפתח הזה לא יוצג שוב. שמור אותו במקום בטוח.
                  <br />
                  להשתמש במפתח, שלח אותו ב-header: <code className="bg-gray-200 px-1 rounded">X-API-Key</code>
                </p>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium"
              >
                הבנתי, שמרתי את המפתח
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">צור מפתח API חדש</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם המפתח *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="לדוגמה: Production API Key"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך תפוגה (אופציונלי)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium"
              >
                צור מפתח
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', expiresAt: '' });
                }}
                className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border-b font-semibold text-gray-600">שם</th>
                {viewMode === 'all' && (
                  <th className="p-3 border-b font-semibold text-gray-600">משתמש</th>
                )}
                <th className="p-3 border-b font-semibold text-gray-600">נוצר ב</th>
                <th className="p-3 border-b font-semibold text-gray-600">שימוש אחרון</th>
                <th className="p-3 border-b font-semibold text-gray-600">תאריך תפוגה</th>
                <th className="p-3 border-b font-semibold text-gray-600">סטטוס</th>
                <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={viewMode === 'all' ? 7 : 6} className="p-4 text-center text-gray-500">
                    טוען...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'all' ? 7 : 6} className="p-4 text-center text-gray-500">
                    אין מפתחות API. צור מפתח חדש כדי להתחיל.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{key.name}</td>
                    <td className="p-3 text-sm">{formatDate(key.createdAt)}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(key.expiresAt)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          key.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {key.isActive ? 'פעיל' : 'מבוטל'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        title="מחק לצמיתות"
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">איך להשתמש במפתח API</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>1. Header:</strong> שלח את המפתח ב-header <code className="bg-blue-100 px-1 rounded">X-API-Key</code>
          </p>
          <p>
            <strong>2. דוגמה עם curl:</strong>
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`curl -H "X-API-Key: sk_your_key_here" \\
  http://localhost:3000/api/soldiers`}
          </pre>
          <p>
            <strong>3. דוגמה עם JavaScript:</strong>
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`fetch('http://localhost:3000/api/soldiers', {
  headers: {
    'X-API-Key': 'sk_your_key_here'
  }
})`}
          </pre>
          <p className="text-red-600 font-semibold mt-2">
            ⚠️ המפתחות API מספקים גישה מלאה ל-API. שמור אותם במקום בטוח!
          </p>
        </div>
      </div>
    </div>
  );
}

