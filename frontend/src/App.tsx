import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { SOCPage } from './pages/SOCPage';
import { PermissionGuard } from './components/PermissionGuard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-[#FAFAFA]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block pending users - they have the same access as outsiders
  if (user.approvalStatus === 'PENDING') {
    logout();
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">החשבון שלך ממתין לאישור</h1>
          <p className="text-gray-600 dark:text-gray-400">אנא המתן לאישור מנהל לפני הגישה לאתר</p>
        </div>
      </div>
    );
  }

  if (user.needsProfileCompletion && user.approvalStatus !== 'PENDING') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-[#FAFAFA]"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/complete-profile"
        element={
          user ? (
            user.needsProfileCompletion && user.approvalStatus !== 'PENDING' ? (
              <CompleteProfilePage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route 
          path="soc" 
          element={
            <PermissionGuard permission="soc.read" fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <h1 className="text-xl font-semibold mb-2 text-black dark:text-white">אין לך הרשאה</h1>
                  <p className="text-gray-600 dark:text-gray-400">אין לך הרשאה לגשת למרכז האבטחה</p>
                </div>
              </div>
            }>
              <SOCPage />
            </PermissionGuard>
          } 
        />
        <Route path="students" element={<div>Students Page - Coming Soon</div>} />
        <Route path="settings" element={<div>Settings Page - Coming Soon</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
