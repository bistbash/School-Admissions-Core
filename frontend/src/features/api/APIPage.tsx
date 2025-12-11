import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Modal } from '../../shared/ui/Modal';
import { apiClient } from '../../shared/lib/api';
import { useErrorHandler } from '../errors/ErrorHandler';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../permissions/PermissionsContext';
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
  Clock,
  BookOpen,
  Lock,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Mail,
  MessageSquare,
  UserCog
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

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  requiresAdmin?: boolean;
  requiredPermission?: string;
  resource?: string;
  action?: string;
  exampleRequest?: string;
  exampleResponse?: string;
}

interface APIEndpointGroup {
  title: string;
  description: string;
  endpoints: APIEndpoint[];
}

export function APIPage() {
  const { user } = useAuth();
  const { hasPermission, hasResourcePermission, hasPagePermission, isLoading: permissionsLoading } = usePermissions();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedAPIKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(true);
  const [showFullDocs, setShowFullDocs] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [codeExampleTab, setCodeExampleTab] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      const newKey = response.data.apiKey;
      setCreatedKey(newKey);
      setNewKeyName('');
      setNewKeyExpiresAt('');
      setTimeRemaining(30);
      await loadAPIKeys();
      
      // Start auto-close timer
      startAutoCloseTimer();
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

  const startAutoCloseTimer = () => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    setTimeRemaining(30);
    
    // Update timer every second
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          handleCloseKeyModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCloseKeyModal = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCreatedKey(null);
    setTimeRemaining(30);
    setCopied(false);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Define all API endpoints
  const allAPIGroups: APIEndpointGroup[] = useMemo(() => [
    {
      title: 'אימות (Authentication)',
      description: 'ניהול משתמשים והתחברות',
      endpoints: [
        {
          method: 'POST',
          path: '/auth/login',
          description: 'התחברות למערכת',
          exampleRequest: JSON.stringify({ email: 'user@example.com', password: 'password' }, null, 2),
          exampleResponse: JSON.stringify({ token: 'jwt_token', user: { id: 1, email: 'user@example.com' } }, null, 2),
        },
        {
          method: 'GET',
          path: '/auth/me',
          description: 'קבלת פרטי משתמש נוכחי',
          exampleResponse: JSON.stringify({ id: 1, email: 'user@example.com', name: 'שם משתמש' }, null, 2),
        },
        {
          method: 'POST',
          path: '/auth/complete-profile',
          description: 'השלמת פרופיל משתמש',
          resource: 'auth',
          action: 'complete-profile',
          requiresAdmin: false,
          exampleRequest: JSON.stringify({ personalNumber: '123456789', name: 'שם', type: 'CONSCRIPT', departmentId: 1, newPassword: 'newpassword' }, null, 2),
        },
        {
          method: 'POST',
          path: '/auth/create-user',
          description: 'יצירת משתמש חדש',
          requiresAdmin: true,
          exampleRequest: JSON.stringify({ email: 'new@example.com', temporaryPassword: 'temp123' }, null, 2),
        },
        {
          method: 'GET',
          path: '/auth/created',
          description: 'קבלת רשימת משתמשים שנוצרו',
          requiresAdmin: true,
        },
        {
          method: 'GET',
          path: '/auth/pending',
          description: 'קבלת רשימת משתמשים ממתינים לאישור',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/auth/:id/approve',
          description: 'אישור משתמש',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/auth/:id/reject',
          description: 'דחיית משתמש',
          requiresAdmin: true,
        },
        {
          method: 'PUT',
          path: '/auth/:id',
          description: 'עדכון משתמש',
          requiresAdmin: true,
        },
        {
          method: 'DELETE',
          path: '/auth/:id',
          description: 'מחיקת משתמש',
          requiresAdmin: true,
        },
      ],
    },
    {
      title: 'מפתחות API (API Keys)',
      description: 'ניהול מפתחות API',
      endpoints: [
        {
          method: 'POST',
          path: '/api-keys',
          description: 'יצירת מפתח API חדש',
          resource: 'api-keys',
          action: 'create',
          exampleRequest: JSON.stringify({ name: 'My API Key', expiresAt: '2026-12-31T23:59:59Z' }, null, 2),
        },
        {
          method: 'GET',
          path: '/api-keys',
          description: 'קבלת מפתחות API של המשתמש',
          resource: 'api-keys',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/api-keys/all',
          description: 'קבלת כל מפתחות ה-API (מנהל בלבד)',
          resource: 'api-keys',
          action: 'read',
          requiresAdmin: true,
        },
        {
          method: 'DELETE',
          path: '/api-keys/:id',
          description: 'מחיקת מפתח API',
          resource: 'api-keys',
          action: 'delete',
        },
      ],
    },
    {
      title: 'תלמידים (Students)',
      description: 'ניהול תלמידים',
      endpoints: [
        {
          method: 'GET',
          path: '/students',
          description: 'קבלת רשימת תלמידים',
          resource: 'students',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/students/:id',
          description: 'קבלת פרטי תלמיד לפי ID',
          resource: 'students',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/students/id-number/:idNumber',
          description: 'קבלת פרטי תלמיד לפי מספר תעודת זהות',
          resource: 'students',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/students',
          description: 'יצירת תלמיד חדש',
          resource: 'students',
          action: 'create',
          exampleRequest: JSON.stringify({ idNumber: '123456789', firstName: 'יוסי', lastName: 'כהן', gender: 'MALE', grade: 'י"א', cohortId: 1, studyStartDate: '2024-09-01T00:00:00Z' }, null, 2),
        },
        {
          method: 'PUT',
          path: '/students/:id',
          description: 'עדכון תלמיד',
          resource: 'students',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/students/:id',
          description: 'מחיקת תלמיד',
          resource: 'students',
          action: 'delete',
        },
        {
          method: 'POST',
          path: '/students/upload',
          description: 'העלאת קובץ Excel עם תלמידים',
          resource: 'students',
          action: 'create',
        },
        {
          method: 'POST',
          path: '/students/promote-all',
          description: 'קידום כל המחזורים',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/students/cohorts/:cohortId/promote',
          description: 'קידום מחזור מסוים',
          requiresAdmin: true,
        },
        {
          method: 'DELETE',
          path: '/students/clear-all',
          description: 'מחיקת כל התלמידים',
          requiresAdmin: true,
        },
      ],
    },
    {
      title: 'עזיבת תלמידים (Student Exits)',
      description: 'ניהול עזיבת תלמידים',
      endpoints: [
        {
          method: 'GET',
          path: '/student-exits',
          description: 'קבלת רשימת עזיבות תלמידים',
          resource: 'student-exits',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/student-exits/student/:studentId',
          description: 'קבלת עזיבת תלמיד מסוים',
          resource: 'student-exits',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/student-exits',
          description: 'יצירת רשומת עזיבה',
          resource: 'student-exits',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/student-exits/:studentId',
          description: 'עדכון רשומת עזיבה',
          resource: 'student-exits',
          action: 'update',
        },
      ],
    },
    {
      title: 'מחזורים (Cohorts)',
      description: 'ניהול מחזורים',
      endpoints: [
        {
          method: 'GET',
          path: '/cohorts',
          description: 'קבלת רשימת מחזורים',
          resource: 'cohorts',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/cohorts/:id',
          description: 'קבלת פרטי מחזור',
          resource: 'cohorts',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/cohorts',
          description: 'יצירת מחזור חדש',
          resource: 'cohorts',
          action: 'create',
          exampleRequest: JSON.stringify({ name: 'מחזור תשפ"ד', startYear: 2024, currentGrade: 'י"א' }, null, 2),
        },
        {
          method: 'PUT',
          path: '/cohorts/:id',
          description: 'עדכון מחזור',
          resource: 'cohorts',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/cohorts/:id',
          description: 'מחיקת מחזור',
          resource: 'cohorts',
          action: 'delete',
        },
      ],
    },
    {
      title: 'כיתות (Classes)',
      description: 'ניהול כיתות',
      endpoints: [
        {
          method: 'GET',
          path: '/classes',
          description: 'קבלת רשימת כיתות',
          resource: 'classes',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/classes/:id',
          description: 'קבלת פרטי כיתה',
          resource: 'classes',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/classes',
          description: 'יצירת כיתה חדשה',
          resource: 'classes',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/classes/:id',
          description: 'עדכון כיתה',
          resource: 'classes',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/classes/:id',
          description: 'מחיקת כיתה',
          resource: 'classes',
          action: 'delete',
        },
      ],
    },
    {
      title: 'חיילים (Soldiers)',
      description: 'ניהול חיילים',
      endpoints: [
        {
          method: 'GET',
          path: '/soldiers',
          description: 'קבלת רשימת חיילים',
          resource: 'soldiers',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/soldiers/:id',
          description: 'קבלת פרטי חייל',
          resource: 'soldiers',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/soldiers',
          description: 'יצירת חייל חדש',
          resource: 'soldiers',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/soldiers/:id',
          description: 'עדכון חייל',
          resource: 'soldiers',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/soldiers/:id',
          description: 'מחיקת חייל',
          requiresAdmin: true,
          resource: 'soldiers',
          action: 'delete',
        },
      ],
    },
    {
      title: 'מחלקות (Departments)',
      description: 'ניהול מחלקות',
      endpoints: [
        {
          method: 'GET',
          path: '/departments',
          description: 'קבלת רשימת מחלקות',
          resource: 'departments',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/departments/:id',
          description: 'קבלת פרטי מחלקה',
          resource: 'departments',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/departments/:id/commanders',
          description: 'קבלת מפקדי מחלקה',
          resource: 'departments',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/departments',
          description: 'יצירת מחלקה חדשה',
          resource: 'departments',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/departments/:id',
          description: 'עדכון מחלקה',
          resource: 'departments',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/departments/:id',
          description: 'מחיקת מחלקה',
          resource: 'departments',
          action: 'delete',
        },
      ],
    },
    {
      title: 'תפקידים (Roles)',
      description: 'ניהול תפקידים',
      endpoints: [
        {
          method: 'GET',
          path: '/roles',
          description: 'קבלת רשימת תפקידים',
          resource: 'roles',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/roles/:id',
          description: 'קבלת פרטי תפקיד',
          resource: 'roles',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/roles/:id/permissions',
          description: 'קבלת הרשאות תפקיד',
          resource: 'roles',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/roles',
          description: 'יצירת תפקיד חדש',
          requiresAdmin: true,
          resource: 'roles',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/roles/:id',
          description: 'עדכון תפקיד',
          requiresAdmin: true,
          resource: 'roles',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/roles/:id',
          description: 'מחיקת תפקיד',
          requiresAdmin: true,
          resource: 'roles',
          action: 'delete',
        },
        {
          method: 'POST',
          path: '/roles/:id/permissions/grant',
          description: 'מתן הרשאה לתפקיד',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/roles/:id/permissions/revoke',
          description: 'הסרת הרשאה מתפקיד',
          requiresAdmin: true,
        },
      ],
    },
    {
      title: 'חדרים (Rooms)',
      description: 'ניהול חדרים',
      endpoints: [
        {
          method: 'GET',
          path: '/rooms',
          description: 'קבלת רשימת חדרים',
          resource: 'rooms',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/rooms/:id',
          description: 'קבלת פרטי חדר',
          resource: 'rooms',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/rooms',
          description: 'יצירת חדר חדש',
          resource: 'rooms',
          action: 'create',
        },
        {
          method: 'PUT',
          path: '/rooms/:id',
          description: 'עדכון חדר',
          resource: 'rooms',
          action: 'update',
        },
        {
          method: 'DELETE',
          path: '/rooms/:id',
          description: 'מחיקת חדר',
          resource: 'rooms',
          action: 'delete',
        },
      ],
    },
    {
      title: 'הרשאות (Permissions)',
      description: 'ניהול הרשאות',
      endpoints: [
        {
          method: 'GET',
          path: '/permissions/my-permissions',
          description: 'קבלת הרשאות המשתמש הנוכחי',
        },
        {
          method: 'GET',
          path: '/permissions',
          description: 'קבלת רשימת כל ההרשאות',
          resource: 'permissions',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/permissions/:id',
          description: 'קבלת פרטי הרשאה',
          resource: 'permissions',
          action: 'read',
        },
        {
          method: 'POST',
          path: '/permissions',
          description: 'יצירת הרשאה חדשה',
          requiresAdmin: true,
        },
        {
          method: 'GET',
          path: '/permissions/users/:userId',
          description: 'קבלת הרשאות משתמש',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/permissions/users/:userId/grant',
          description: 'מתן הרשאה למשתמש',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/permissions/users/:userId/revoke',
          description: 'הסרת הרשאה ממשתמש',
          requiresAdmin: true,
        },
        {
          method: 'GET',
          path: '/permissions/:permissionId/users',
          description: 'קבלת משתמשים עם הרשאה מסוימת',
          requiresAdmin: true,
        },
      ],
    },
    {
      title: 'SOC (Security Operations Center)',
      description: 'מרכז פעולות אבטחה',
      endpoints: [
        {
          method: 'GET',
          path: '/soc/audit-logs',
          description: 'קבלת לוגי ביקורת',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/stats',
          description: 'קבלת סטטיסטיקות אבטחה',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/alerts',
          description: 'קבלת התרעות אבטחה',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/incidents',
          description: 'קבלת תק incidents פתוחות',
          requiredPermission: 'soc.read',
        },
        {
          method: 'PUT',
          path: '/soc/incidents/:id',
          description: 'עדכון תקלה',
          requiredPermission: 'soc.write',
        },
        {
          method: 'POST',
          path: '/soc/incidents/:id/mark',
          description: 'סימון כמתרעה',
          requiredPermission: 'soc.write',
        },
        {
          method: 'GET',
          path: '/soc/users/:userId/activity',
          description: 'קבלת פעילות משתמש',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/resources/:resource/:resourceId',
          description: 'קבלת היסטוריית משאב',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/metrics',
          description: 'קבלת מדדי אבטחה',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/export/logs',
          description: 'ייצוא לוגים',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/export/stats',
          description: 'ייצוא סטטיסטיקות',
          requiredPermission: 'soc.read',
        },
        {
          method: 'GET',
          path: '/soc/blocked-ips',
          description: 'קבלת כתובות IP חסומות',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/soc/block-ip',
          description: 'חסימת כתובת IP',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/soc/unblock-ip',
          description: 'ביטול חסימת כתובת IP',
          requiresAdmin: true,
        },
        {
          method: 'GET',
          path: '/soc/trusted-users',
          description: 'קבלת משתמשים מהימנים',
          requiresAdmin: true,
        },
        {
          method: 'POST',
          path: '/soc/trusted-users',
          description: 'הוספת משתמש מהימן',
          requiresAdmin: true,
        },
        {
          method: 'DELETE',
          path: '/soc/trusted-users/:id',
          description: 'הסרת משתמש מהימן',
          requiresAdmin: true,
        },
      ],
    },
    {
      title: 'חיפוש (Search)',
      description: 'חיפוש במערכת',
      endpoints: [
        {
          method: 'GET',
          path: '/search/pages',
          description: 'קבלת כל הדפים',
          resource: 'search',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/search/pages/search',
          description: 'חיפוש דפים',
          resource: 'search',
          action: 'read',
        },
        {
          method: 'GET',
          path: '/search/pages/categories',
          description: 'קבלת דפים לפי קטגוריה',
          resource: 'search',
          action: 'read',
        },
      ],
    },
    {
      title: 'תיעוד (Documentation)',
      description: 'תיעוד המערכת',
      endpoints: [
        {
          method: 'GET',
          path: '/docs',
          description: 'קבלת תיעוד המערכת',
        },
      ],
    },
  ], []);

  // Filter endpoints based on user permissions
  const visibleAPIGroups = useMemo(() => {
    if (!user || permissionsLoading) return [];
    
    return allAPIGroups.map(group => ({
      ...group,
      endpoints: group.endpoints.filter(endpoint => {
        // Public endpoints (no requirements)
        if (!endpoint.requiresAdmin && !endpoint.requiredPermission && !endpoint.resource) {
          return true;
        }
        
        // Admin required
        if (endpoint.requiresAdmin) {
          return user.isAdmin;
        }
        
        // Permission required
        if (endpoint.requiredPermission) {
          return user.isAdmin || hasPermission(endpoint.requiredPermission);
        }
        
        // Resource-based permission - check via page permissions for better accuracy
        if (endpoint.resource && endpoint.action) {
          if (user.isAdmin) return true;
          
          // Special handling for auth/complete-profile - only for CREATED/PENDING users
          if (endpoint.resource === 'auth' && endpoint.action === 'complete-profile') {
            // Show only if user is CREATED or PENDING (needs profile completion)
            return user.approvalStatus === 'CREATED' || user.approvalStatus === 'PENDING';
          }
          
          // Check if this is an API Keys endpoint that requires edit permission
          if (endpoint.resource === 'api-keys' && (endpoint.action === 'create' || endpoint.action === 'delete')) {
            // POST /api-keys (create) and DELETE /api/api-keys/:id (delete) require edit permission
            return hasPagePermission('api-keys', 'edit');
          }
          
          // For other endpoints, check resource:action permission or page permission
          // Try page permission first (more accurate)
          const pageMap: Record<string, string> = {
            'students': 'students',
            'api-keys': 'api-keys',
            'soc': 'soc',
            'cohorts': 'cohorts',
            'classes': 'classes',
            'student-exits': 'student-exits',
            'tracks': 'tracks',
            'search': 'dashboard', // Search endpoints are part of dashboard page
            'dashboard': 'dashboard', // Dashboard endpoints
          };
          
          const pageName = pageMap[endpoint.resource];
          if (pageName) {
            // For edit actions (create, update, delete), check edit permission
            if (endpoint.action === 'create' || endpoint.action === 'update' || endpoint.action === 'delete') {
              return hasPagePermission(pageName, 'edit');
            }
            // For read actions, check view permission (edit includes view)
            if (endpoint.action === 'read') {
              return hasPagePermission(pageName, 'view');
            }
          }
          
          // Fallback to resource:action permission check
          return hasResourcePermission(endpoint.resource, endpoint.action);
        }
        
        // Default: show if authenticated
        return true;
      }),
    })).filter(group => group.endpoints.length > 0);
  }, [user, allAPIGroups, hasPermission, hasResourcePermission, hasPagePermission, permissionsLoading]);

  const toggleGroup = (title: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedGroups(newExpanded);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'POST':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'PUT':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Key className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
              מפתחות API
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              ניהול מפתחות API והתיעוד המלא של המערכת
            </p>
          </div>
        </div>
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
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Code className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">הדרכה לשימוש ב-API</CardTitle>
                <CardDescription className="mt-1">
                  הוראות שימוש במפתחות API לגישה ל-API של המערכת
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDocs(!showDocs)}
            >
              {showDocs ? 'הסתר' : 'הצג'}
            </Button>
          </div>
        </CardHeader>
        {showDocs && (
          <CardContent className="space-y-8">
            {/* Getting Started */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-[#1F1F1F]">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  התחלה מהירה
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                מפתחות API מאפשרים גישה מאובטחת ל-API של המערכת ללא צורך בהתחברות דרך ממשק המשתמש. 
                כל בקשה דורשת מפתח API תקין ב-header של הבקשה.
              </p>
            </div>

            {/* Base URL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  כתובת בסיס (Base URL)
                </h3>
              </div>
              <div className="relative">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                  <code className="text-sm text-gray-900 dark:text-gray-100 font-mono select-all">
                    {baseURL}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(baseURL)}
                  className="absolute top-2 left-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Authentication Methods */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  דרכי אימות
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ניתן להשתמש במפתח API בשתי דרכים - שתיהן תקפות:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/50">
                      <Key className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                      X-API-Key Header
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                    השימוש המומלץ למפתחות API
                  </p>
                  <code className="text-xs text-blue-900 dark:text-blue-100 font-mono block bg-white/50 dark:bg-black/20 p-2 rounded">
                    X-API-Key: sk_...
                  </code>
                </div>
                
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/50">
                      <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wide">
                      Authorization Bearer
                    </span>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-200 mb-2">
                    תאימות עם תקן OAuth 2.0
                  </p>
                  <code className="text-xs text-purple-900 dark:text-purple-100 font-mono block bg-white/50 dark:bg-black/20 p-2 rounded">
                    Authorization: Bearer sk_...
                  </code>
                </div>
              </div>
            </div>

            {/* Code Examples with Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  דוגמאות קוד
                </h3>
              </div>
              
              {/* Tab Selector */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-[#1F1F1F]">
                {(['curl', 'javascript', 'python'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCodeExampleTab(tab)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                      codeExampleTab === tab
                        ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    {tab === 'curl' ? 'cURL' : tab === 'javascript' ? 'JavaScript' : 'Python'}
                  </button>
                ))}
              </div>

              {/* Code Examples */}
              <div className="space-y-4">
                {/* GET Request */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    בקשת GET - קבלת רשימת תלמידים
                  </p>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-gray-900 dark:bg-[#0F0F0F] border-2 border-gray-800 dark:border-[#1A1A1A] overflow-x-auto">
                      <code className="text-xs text-gray-100 font-mono">
                        {codeExampleTab === 'curl' && (
                          `curl -X GET "${baseURL}/students" \\\n  -H "X-API-Key: sk_your_api_key_here" \\\n  -H "Content-Type: application/json"`
                        )}
                        {codeExampleTab === 'javascript' && (
                          `const response = await fetch('${baseURL}/students', {\n  method: 'GET',\n  headers: {\n    'X-API-Key': 'sk_your_api_key_here',\n    'Content-Type': 'application/json'\n  }\n});\n\nconst data = await response.json();\nconsole.log(data);`
                        )}
                        {codeExampleTab === 'python' && (
                          `import requests\n\nheaders = {\n    'X-API-Key': 'sk_your_api_key_here',\n    'Content-Type': 'application/json'\n}\n\nresponse = requests.get('${baseURL}/students', headers=headers)\ndata = response.json()\nprint(data)`
                        )}
                      </code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const code = codeExampleTab === 'curl' 
                          ? `curl -X GET "${baseURL}/students" -H "X-API-Key: sk_your_api_key_here"`
                          : codeExampleTab === 'javascript'
                          ? `fetch('${baseURL}/students', { headers: { 'X-API-Key': 'sk_your_api_key_here' } })`
                          : `requests.get('${baseURL}/students', headers={'X-API-Key': 'sk_your_api_key_here'})`;
                        copyToClipboard(code);
                      }}
                      className="absolute top-2 left-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* POST Request */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    בקשת POST - יצירת תלמיד חדש
                  </p>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-gray-900 dark:bg-[#0F0F0F] border-2 border-gray-800 dark:border-[#1A1A1A] overflow-x-auto">
                      <code className="text-xs text-gray-100 font-mono">
                        {codeExampleTab === 'curl' && (
                          `curl -X POST "${baseURL}/students" \\\n  -H "X-API-Key: sk_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "idNumber": "123456789",\n    "firstName": "יוסי",\n    "lastName": "כהן",\n    "gender": "MALE",\n    "grade": "י"א",\n    "cohortId": 1,\n    "studyStartDate": "2024-09-01T00:00:00Z"\n  }'`
                        )}
                        {codeExampleTab === 'javascript' && (
                          `const response = await fetch('${baseURL}/students', {\n  method: 'POST',\n  headers: {\n    'X-API-Key': 'sk_your_api_key_here',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    idNumber: '123456789',\n    firstName: 'יוסי',\n    lastName: 'כהן',\n    gender: 'MALE',\n    grade: 'י"א',\n    cohortId: 1,\n    studyStartDate: '2024-09-01T00:00:00Z'\n  })\n});\n\nconst data = await response.json();`
                        )}
                        {codeExampleTab === 'python' && (
                          `import requests\n\nheaders = {\n    'X-API-Key': 'sk_your_api_key_here',\n    'Content-Type': 'application/json'\n}\n\ndata = {\n    'idNumber': '123456789',\n    'firstName': 'יוסי',\n    'lastName': 'כהן',\n    'gender': 'MALE',\n    'grade': 'י"א',\n    'cohortId': 1,\n    'studyStartDate': '2024-09-01T00:00:00Z'\n}\n\nresponse = requests.post('${baseURL}/students', headers=headers, json=data)`
                        )}
                      </code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const code = codeExampleTab === 'curl'
                          ? `curl -X POST "${baseURL}/students" -H "X-API-Key: sk_your_api_key_here" -H "Content-Type: application/json" -d '{"idNumber":"123456789","firstName":"יוסי","lastName":"כהן","gender":"MALE","grade":"י\\"א","cohortId":1}'`
                          : codeExampleTab === 'javascript'
                          ? `fetch('${baseURL}/students', { method: 'POST', headers: { 'X-API-Key': 'sk_your_api_key_here', 'Content-Type': 'application/json' }, body: JSON.stringify({ idNumber: '123456789', firstName: 'יוסי', lastName: 'כהן', gender: 'MALE', grade: 'י"א', cohortId: 1 }) })`
                          : `requests.post('${baseURL}/students', headers={'X-API-Key': 'sk_your_api_key_here'}, json={'idNumber': '123456789', 'firstName': 'יוסי', 'lastName': 'כהן', 'gender': 'MALE', 'grade': 'י"א', 'cohortId': 1})`;
                        copyToClipboard(code);
                      }}
                      className="absolute top-2 left-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Using Authorization Bearer */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    שימוש ב-Authorization Bearer
                  </p>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-gray-900 dark:bg-[#0F0F0F] border-2 border-gray-800 dark:border-[#1A1A1A] overflow-x-auto">
                      <code className="text-xs text-gray-100 font-mono">
                        {codeExampleTab === 'curl' && (
                          `curl -X GET "${baseURL}/students" \\\n  -H "Authorization: Bearer sk_your_api_key_here"`
                        )}
                        {codeExampleTab === 'javascript' && (
                          `const response = await fetch('${baseURL}/students', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer sk_your_api_key_here'\n  }\n});`
                        )}
                        {codeExampleTab === 'python' && (
                          `import requests\n\nheaders = {\n    'Authorization': 'Bearer sk_your_api_key_here'\n}\n\nresponse = requests.get('${baseURL}/students', headers=headers)`
                        )}
                      </code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const code = codeExampleTab === 'curl'
                          ? `curl -X GET "${baseURL}/students" -H "Authorization: Bearer sk_your_api_key_here"`
                          : codeExampleTab === 'javascript'
                          ? `fetch('${baseURL}/students', { headers: { 'Authorization': 'Bearer sk_your_api_key_here' } })`
                          : `requests.get('${baseURL}/students', headers={'Authorization': 'Bearer sk_your_api_key_here'})`;
                        copyToClipboard(code);
                      }}
                      className="absolute top-2 left-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-[#1F1F1F]">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  שיטות עבודה מומלצות
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    מה לעשות
                  </h4>
                  <ul className="text-xs text-green-800 dark:text-green-200 space-y-1.5 list-disc list-inside">
                    <li>שמור את המפתח בסביבה מאובטחת (environment variables)</li>
                    <li>השתמש ב-HTTPS בלבד בפרודקשן</li>
                    <li>הגבל הרשאות לפי הצורך</li>
                    <li>עקוב אחר שימוש במפתחות</li>
                    <li>סובב מפתחות באופן קבוע</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    מה לא לעשות
                  </h4>
                  <ul className="text-xs text-red-800 dark:text-red-200 space-y-1.5 list-disc list-inside">
                    <li>אל תכלול מפתחות בקוד מקור (Git)</li>
                    <li>אל תשתף מפתחות במייל או הודעות</li>
                    <li>אל תשתמש ב-HTTP בפרודקשן</li>
                    <li>אל תיצור מפתחות עם הרשאות מיותרות</li>
                    <li>אל תשכח למחוק מפתחות לא פעילים</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-5 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                  <AlertCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    התראת אבטחה חשובה
                  </h4>
                  <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 list-disc list-inside">
                    <li><strong>המפתח מוצג פעם אחת בלבד</strong> - לאחר יצירתו, לא תוכל לראות אותו שוב</li>
                    <li><strong>שמור מיד</strong> - העתק את המפתח למקום מאובטח מיד לאחר יצירתו</li>
                    <li><strong>אם נחשף</strong> - מחק את המפתח מיד ויצור חדש</li>
                    <li><strong>HTTPS בלבד</strong> - אל תשלח מפתחות על גבי HTTP</li>
                    <li><strong>הרשאות מינימליות</strong> - השתמש בהרשאות הנמוכות ביותר הנדרשות</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Common Issues */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  פתרון בעיות נפוצות
                </h3>
              </div>
              <div className="space-y-3">
                <details className="p-3 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
                  <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                    שגיאת 401 - Unauthorized
                  </summary>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    ודא שהמפתח נשלח נכון ב-header. בדוק שאין רווחים מיותרים ושהמפתח לא פג תוקף.
                  </p>
                </details>
                <details className="p-3 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
                  <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                    שגיאת 403 - Forbidden
                  </summary>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    המפתח תקין אבל אין לך הרשאה לפעולה זו. בדוק את הרשאות המשתמש שלך.
                  </p>
                </details>
                <details className="p-3 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
                  <summary className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                    מפתח לא עובד אחרי יצירה
                  </summary>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    ודא שהעתקת את המפתח במלואו כולל הקידומת "sk_". נסה ליצור מפתח חדש אם הבעיה נמשכת.
                  </p>
                </details>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Full API Documentation */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <BookOpen className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">תיעוד API מלא</CardTitle>
                <CardDescription className="mt-1">
                  תיעוד מלא של כל ה-API endpoints הזמינים עבורך (תלוי בהרשאות)
                  {!permissionsLoading && visibleAPIGroups.length > 0 && (
                    <span className="block mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {visibleAPIGroups.reduce((sum, group) => sum + group.endpoints.length, 0)} endpoints זמינים ב-{visibleAPIGroups.length} קטגוריות
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDocs(!showFullDocs)}
            >
              {showFullDocs ? 'הסתר' : 'הצג'}
            </Button>
          </div>
        </CardHeader>
        {showFullDocs && (
          <CardContent className="space-y-4">
            {permissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
                <span className="mr-3 text-sm text-gray-600 dark:text-gray-400">טוען הרשאות...</span>
              </div>
            ) : visibleAPIGroups.length === 0 ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  אין endpoints זמינים עבורך כרגע
                </p>
              </div>
            ) : (
              visibleAPIGroups.map((group) => (
                <div
                  key={group.title}
                  className="border border-gray-200 dark:border-[#1F1F1F] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full p-4 bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-between"
                  >
                    <div className="text-right">
                      <h3 className="text-sm font-semibold text-black dark:text-white">
                        {group.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {group.description}
                      </p>
                    </div>
                    {expandedGroups.has(group.title) ? (
                      <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  {expandedGroups.has(group.title) && (
                    <div className="p-4 space-y-3 bg-white dark:bg-[#080808]">
                      {group.endpoints.map((endpoint, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-mono rounded border',
                                getMethodColor(endpoint.method)
                              )}
                            >
                              {endpoint.method}
                            </span>
                            <code className="text-sm font-mono text-black dark:text-white flex-1">
                              {baseURL}{endpoint.path}
                            </code>
                            {endpoint.requiresAdmin && (
                              <span className="px-2 py-0.5 text-xs rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                מנהל
                              </span>
                            )}
                            {endpoint.requiredPermission && (
                              <span className="px-2 py-0.5 text-xs rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                {endpoint.requiredPermission}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {endpoint.description}
                          </p>
                          {endpoint.exampleRequest && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                דוגמת בקשת:
                              </p>
                              <pre className="p-2 rounded bg-gray-100 dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                                {endpoint.exampleRequest}
                              </pre>
                            </div>
                          )}
                          {endpoint.exampleResponse && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                דוגמת תשובה:
                              </p>
                              <pre className="p-2 rounded bg-gray-100 dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                                {endpoint.exampleResponse}
                              </pre>
                            </div>
                          )}
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${endpoint.method} ${baseURL}${endpoint.path}`)}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              העתק נתיב
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Create New Key or Permission Required Message */}
      {hasPagePermission('api-keys', 'edit') ? (
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Key className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">יצירת מפתח API חדש</CardTitle>
                <CardDescription className="mt-1">
                  צור מפתח API חדש לגישה ל-API של המערכת
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateKey} className="space-y-5">
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
              <Button 
                type="submit" 
                isLoading={isCreating} 
                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 font-medium"
                size="lg"
              >
                <Key className="h-4 w-4" />
                צור מפתח חדש
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card variant="elevated" className="border-blue-200 dark:border-blue-800/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Lock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                  יצירת מפתח API
                </CardTitle>
                <CardDescription className="mt-1 text-gray-600 dark:text-gray-400">
                  דורש הרשאת עריכה לדף מפתחות API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F] p-6">
              <div className="relative flex flex-col sm:flex-row items-start gap-5">
                <div className="shrink-0">
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <UserCog className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    הרשאה נדרשת
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    כדי ליצור מפתחות API, אתה צריך הרשאת עריכה לדף <span className="font-medium text-gray-900 dark:text-gray-100">מפתחות API</span>.
                    הרשאה זו ניתנת בדרך כלל למפתחים ולמשתמשים שמתאימים לניהול גישות API.
                  </p>
                  <div className="mt-4 p-4 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          איך לקבל הרשאה?
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          פנה למנהל המערכת שלך ובקש הרשאת עריכה לדף מפתחות API. לאחר קבלת ההרשאה, תוכל ליצור ולנהל מפתחות API.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Key Modal */}
      <Modal
        isOpen={!!createdKey}
        onClose={handleCloseKeyModal}
        title="מפתח API נוצר בהצלחה!"
        size="lg"
        showCloseButton={false}
        closeOnBackdropClick={false}
      >
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="relative p-4 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                <AlertCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  זהו הפעם היחידה שתראה את המפתח הזה!
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  שמור את המפתח במקום בטוח. לאחר סגירת החלון, לא תוכל לראות אותו שוב.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                מפתח ה-API שלך:
              </label>
              <div className="flex items-center gap-2">
                {timeRemaining > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                      <svg className="transform -rotate-90 w-8 h-8">
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14 * (1 - timeRemaining / 30)}`}
                          className={cn(
                            "transition-all duration-1000",
                            timeRemaining <= 10 ? "text-red-500" : "text-blue-500"
                          )}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={cn(
                        "absolute inset-0 flex items-center justify-center text-xs font-bold",
                        timeRemaining <= 10 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                      )}>
                        {timeRemaining}
                      </span>
                    </div>
                    <span className={cn(
                      "text-xs font-mono",
                      timeRemaining <= 10 ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"
                    )}>
                      נסגר אוטומטית בעוד {timeRemaining} שניות
                    </span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey?.key || '')}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      העתק מפתח
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="p-5 rounded-lg bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-[#1F1F1F]">
                <code className="text-base font-mono text-gray-900 dark:text-gray-100 break-all block select-all leading-relaxed">
                  {createdKey?.key}
                </code>
              </div>
              <div className="absolute top-2 left-2 opacity-20">
                <Sparkles className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Key Details */}
          {createdKey && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">שם המפתח</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{createdKey.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">נוצר בתאריך</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(createdKey.createdAt)}
                </p>
              </div>
              {createdKey.expiresAt && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך תפוגה</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(createdKey.expiresAt)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              איך להשתמש במפתח?
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>השתמש ב-header <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded">X-API-Key</code> או <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded">Authorization: Bearer</code></li>
              <li>השתמש ב-HTTPS בלבד בעת שליחת בקשות</li>
              <li>אל תשתף את המפתח עם אחרים</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
            <Button
              variant="outline"
              onClick={handleCloseKeyModal}
              className="gap-2"
            >
              סגור
            </Button>
            <Button
              onClick={handleCloseKeyModal}
              className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 font-medium"
            >
              <Check className="h-4 w-4" />
              שמרתי את המפתח
            </Button>
          </div>
        </div>
      </Modal>

      {/* Existing Keys */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Key className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">מפתחות API קיימים</CardTitle>
              <CardDescription className="mt-1">
                רשימת כל מפתחות ה-API שלך
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Key className="h-8 w-8 text-gray-400 dark:text-gray-600" />
              </div>
              {hasPagePermission('api-keys', 'edit') ? (
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    אין מפתחות API
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    צור מפתח חדש כדי להתחיל להשתמש ב-API של המערכת
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-md mx-auto">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    אין מפתחות API
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      כדי ליצור מפתחות API, פנה למנהל המערכת לקבלת הרשאת עריכה
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={cn(
                    'p-5 rounded-lg border transition-all duration-100',
                    isExpired(key.expiresAt)
                      ? 'border-red-200 dark:border-red-900 bg-gray-50 dark:bg-[#0F0F0F]'
                      : 'bg-white dark:bg-[#080808] border-gray-200 dark:border-[#1F1F1F] hover:border-gray-300 dark:hover:border-[#404040]'
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        'p-2 rounded-lg border',
                        isExpired(key.expiresAt)
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      )}>
                        <Key className={cn(
                          'h-4 w-4',
                          'text-gray-700 dark:text-gray-300'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-black dark:text-white truncate">
                          {key.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {!key.isActive && (
                            <span className="px-2 py-0.5 text-xs rounded-md bg-gray-200 dark:bg-[#1F1F1F] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#404040]">
                              לא פעיל
                            </span>
                          )}
                          {isExpired(key.expiresAt) && (
                            <span className="px-2 py-0.5 text-xs rounded-md bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                              פג תוקף
                            </span>
                          )}
                          {key.isActive && !isExpired(key.expiresAt) && (
                            <span className="px-2 py-0.5 text-xs rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                              פעיל
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeKey(key.id, key.name)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>נוצר: {formatDate(key.createdAt)}</span>
                    </div>
                    {key.lastUsedAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>שימוש אחרון: {formatDate(key.lastUsedAt)}</span>
                      </div>
                    )}
                    {key.expiresAt && (
                      <div className={cn(
                        "flex items-center gap-2 text-xs",
                        isExpired(key.expiresAt)
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-600 dark:text-gray-400"
                      )}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>תפוגה: {formatDate(key.expiresAt)}</span>
                      </div>
                    )}
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
