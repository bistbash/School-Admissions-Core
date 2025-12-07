import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GenericResourcePanel, type Field } from './components/GenericResourcePanel';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { SOCDashboard } from './components/SOCDashboard';
import { APIKeysPanel } from './components/APIKeysPanel';
import { StudentsPanel } from './components/StudentsPanel';
import apiClient from './lib/api';
import { authStorage } from './lib/auth';
import type { SelectOption } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResourceConfig {
  id: string;
  label: string;
  endpoint: string;
  fields: Field[];
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('soldiers');
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      // Verify token is valid by calling /auth/me
      try {
        await apiClient.get('/auth/me');
        setIsAuthenticated(true);
      } catch (error) {
        // Token is invalid, clear it
        authStorage.removeToken();
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch dependencies for select options (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchDeps = async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          apiClient.get('/departments'),
          apiClient.get('/roles')
        ]);
        setDepartments(dRes.data.map((d: { id: number; name: string }) => ({ value: d.id, label: d.name })));
        setRoles(rRes.data.map((r: { id: number; name: string }) => ({ value: r.id, label: r.name })));
      } catch (e: any) {
        console.error("Failed to fetch dependencies", e);
        // If unauthorized, logout
        if (e?.response?.status === 401) {
          authStorage.removeToken();
          setIsAuthenticated(false);
        }
      }
    };
    fetchDeps();
  }, [isAuthenticated]);

  const resources: ResourceConfig[] = [
    {
      id: 'soldiers',
      label: 'חיילים',
      endpoint: '/soldiers',
      fields: [
        { name: 'personalNumber', label: 'מספר אישי', type: 'text', required: true },
        { name: 'name', label: 'שם מלא', type: 'text', required: true },
        { name: 'email', label: 'אימייל', type: 'email', required: true },
        { name: 'password', label: 'סיסמה (מינימום 8 תווים)', type: 'password', required: true }, // Note: Use /auth/register for proper password hashing
        {
          name: 'type',
          label: 'סוג שירות',
          type: 'select',
          options: [
            { value: 'CONSCRIPT', label: 'חובה' },
            { value: 'PERMANENT', label: 'קבע' }
          ],
          required: true
        },
        { name: 'departmentId', label: 'מחלקה', type: 'select', options: departments, required: true },
        { name: 'roleId', label: 'תפקיד', type: 'select', options: roles, required: false },
        { name: 'isCommander', label: 'האם מפקד?', type: 'checkbox' },
      ]
    },
    {
      id: 'departments',
      label: 'מחלקות',
      endpoint: '/departments',
      fields: [
        { name: 'name', label: 'שם המחלקה', type: 'text', required: true },
      ]
    },
    {
      id: 'roles',
      label: 'תפקידים',
      endpoint: '/roles',
      fields: [
        { name: 'name', label: 'שם התפקיד', type: 'text', required: true },
      ]
    },
    {
      id: 'rooms',
      label: 'חדרים',
      endpoint: '/rooms',
      fields: [
        { name: 'name', label: 'שם החדר', type: 'text', required: true },
        { name: 'capacity', label: 'קיבולת', type: 'number', required: true },
      ]
    }
  ];

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
    // Refresh the page to ensure clean state
    window.location.reload();
  };

  const handleLogout = () => {
    authStorage.removeToken();
    setIsAuthenticated(false);
    // Refresh to show login form
    window.location.reload();
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-lg text-gray-600">בודק הרשאות...</div>
        </div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8" dir="rtl">
        {showRegister ? (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  const activeResource = resources.find(r => r.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
          <h1 className="text-3xl font-bold text-gray-900">מערכת ניהול משאבים צבאיים</h1>
          <p className="text-gray-500">כלי בדיקת API גנרי</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              התנתק
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          {resources.map((res) => (
            <button
              key={res.id}
              onClick={() => setActiveTab(res.id)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === res.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              )}
            >
              {res.label}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('soc')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'soc'
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            )}
          >
            מרכז ביטחון (SOC)
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'api-keys'
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            )}
          >
            מפתחות API
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'students'
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            )}
          >
            תלמידים
          </button>
        </div>

        <main className="bg-white rounded-lg shadow p-6">
          {activeTab === 'soc' ? (
            <SOCDashboard />
          ) : activeTab === 'api-keys' ? (
            <APIKeysPanel />
          ) : activeTab === 'students' ? (
            <StudentsPanel />
          ) : activeResource ? (
            <GenericResourcePanel
              key={activeResource.id} // Force re-mount on tab change to reset state
              title={activeResource.label}
              endpoint={activeResource.endpoint}
              fields={activeResource.fields}
            />
          ) : (
            <div>בחר משאב</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
