import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { apiClient } from '../../shared/lib/api';
import { useErrorHandler } from '../errors/ErrorHandler';
import { 
  Key, 
  Copy, 
  Trash2, 
  Check, 
  AlertCircle, 
  Info,
  Code,
  ExternalLink,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';

interface APIKey {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

interface CreatedAPIKey {
  id: number;
  key: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
}

export function APIPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedAPIKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(true);
  const { handleError } = useErrorHandler();

  const loadAPIKeys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/api-keys');
      setApiKeys(response.data || []);
    } catch (err: any) {
      console.error('Error loading API keys:', err);
      
      // If it's a permission error (403) or server error (500+), redirect to error page
      if (err.response?.status === 403 || err.response?.status >= 500) {
        handleError(err);
        return;
      }
      
      // For other errors, show inline error message
      setError(err.response?.data?.error || err.message || 'שגיאה בטעינת מפתחות API');
      setApiKeys([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('יש להזין שם למפתח');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const payload: any = { name: newKeyName.trim() };
      
      if (newKeyExpiresAt) {
        // Convert local datetime to ISO string
        const date = new Date(newKeyExpiresAt);
        payload.expiresAt = date.toISOString();
      }

      const response = await apiClient.post('/api-keys', payload);
      setCreatedKey(response.data.apiKey);
      setNewKeyName('');
      setNewKeyExpiresAt('');
      await loadAPIKeys();
    } catch (err: any) {
      // If it's a permission error (403) or server error (500+), redirect to error page
      if (err.response?.status === 403 || err.response?.status >= 500) {
        handleError(err);
        return;
      }
      setError(err.response?.data?.error || err.message || 'שגיאה ביצירת מפתח API');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: number, keyName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המפתח "${keyName}"? פעולה זו לא ניתנת לביטול.`)) {
      return;
    }

    try {
      await apiClient.delete(`/api-keys/${keyId}`);
      await loadAPIKeys();
      if (createdKey?.id === keyId) {
        setCreatedKey(null);
      }
    } catch (err: any) {
      // If it's a permission error (403) or server error (500+), redirect to error page
      if (err.response?.status === 403 || err.response?.status >= 500) {
        handleError(err);
        return;
      }
      setError(err.response?.data?.error || err.message || 'שגיאה במחיקת מפתח');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('שגיאה בהעתקה ללוח');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא הוגדר';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  return (
    <div className="space-y-8 animate-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white flex items-center gap-2">
          <Key className="h-6 w-6" />
          מפתחות API
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ניהול מפתחות API לגישה למערכת
        </p>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-black dark:text-white" />
              <CardTitle>הדרכה לשימוש ב-API</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDocs(!showDocs)}
            >
              {showDocs ? 'הסתר' : 'הצג'}
            </Button>
          </div>
          <CardDescription>
            הוראות שימוש במפתחות API לגישה ל-API של המערכת
          </CardDescription>
        </CardHeader>
        {showDocs && (
          <CardContent className="space-y-6">
            {/* Authentication */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4" />
                אימות (Authentication)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ניתן להשתמש במפתח API בשתי דרכים:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 mb-2">
                    Header: X-API-Key
                  </p>
                  <code className="text-xs text-gray-800 dark:text-gray-200 block">
                    {`curl -H "X-API-Key: sk_your_api_key_here" ${baseURL}/students`}
                  </code>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 mb-2">
                    Header: Authorization Bearer
                  </p>
                  <code className="text-xs text-gray-800 dark:text-gray-200 block">
                    {`curl -H "Authorization: Bearer sk_your_api_key_here" ${baseURL}/students`}
                  </code>
                </div>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                כתובת בסיס (Base URL)
              </h3>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                <code className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                  {baseURL}
                </code>
              </div>
            </div>

            {/* Example Endpoints */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                <Code className="h-4 w-4" />
                דוגמאות לנתיבים
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">קבלת רשימת תלמידים</p>
                  <code className="text-xs text-gray-800 dark:text-gray-200 font-mono block">
                    GET {baseURL}/students
                  </code>
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">קבלת פרטי משתמש נוכחי</p>
                  <code className="text-xs text-gray-800 dark:text-gray-200 font-mono block">
                    GET {baseURL}/auth/me
                  </code>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    אבטחה חשובה
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>שמור את מפתח ה-API שלך בסוד - אל תשתף אותו עם אחרים</li>
                    <li>המפתח מוצג רק פעם אחת בעת יצירתו - שמור אותו במקום בטוח</li>
                    <li>אם המפתח נחשף, מחק אותו מיד ויצור חדש</li>
                    <li>השתמש ב-HTTPS בלבד בעת שליחת בקשות</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Create New Key */}
      <Card>
        <CardHeader>
          <CardTitle>יצירת מפתח API חדש</CardTitle>
          <CardDescription>
            צור מפתח API חדש לגישה ל-API של המערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateKey} className="space-y-4">
            <Input
              label="שם המפתח"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="לדוגמה: Production API Key"
              required
            />
            <Input
              label="תאריך תפוגה (אופציונלי)"
              type="datetime-local"
              value={newKeyExpiresAt}
              onChange={(e) => setNewKeyExpiresAt(e.target.value)}
              helperText="אם לא מוגדר, המפתח לא יפוג"
            />
            <Button type="submit" isLoading={isCreating} className="w-full sm:w-auto">
              <Key className="h-4 w-4" />
              צור מפתח חדש
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Created Key Display */}
      {createdKey && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
              <Check className="h-4 w-4" />
              מפתח נוצר בהצלחה!
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-200">
              זהו הפעם היחידה שתראה את המפתח הזה. שמור אותו במקום בטוח.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white dark:bg-[#1C1C1C] border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">מפתח API:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey.key)}
                  className="h-6 px-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      העתק
                    </>
                  )}
                </Button>
              </div>
              <code className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all block">
                {createdKey.key}
              </code>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
              <AlertCircle className="h-3 w-3" />
              <span>אם תאבד את המפתח, תצטרך למחוק אותו וליצור חדש</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreatedKey(null)}
              className="w-full"
            >
              סגור
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Keys */}
      <Card>
        <CardHeader>
          <CardTitle>מפתחות API קיימים</CardTitle>
          <CardDescription>
            רשימת כל מפתחות ה-API שלך
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                אין מפתחות API. צור מפתח חדש כדי להתחיל.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all duration-150',
                    isExpired(key.expiresAt)
                      ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                      : 'bg-gray-50 dark:bg-[#262626] border-gray-200 dark:border-[#333333]'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-black dark:text-white">
                          {key.name}
                        </h4>
                        {!key.isActive && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-gray-200 dark:bg-[#333333] text-gray-700 dark:text-gray-300">
                            לא פעיל
                          </span>
                        )}
                        {isExpired(key.expiresAt) && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200">
                            פג תוקף
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>נוצר: {formatDate(key.createdAt)}</span>
                        </div>
                        {key.lastUsedAt && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>שימוש אחרון: {formatDate(key.lastUsedAt)}</span>
                          </div>
                        )}
                        {key.expiresAt && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>תפוגה: {formatDate(key.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeKey(key.id, key.name)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
