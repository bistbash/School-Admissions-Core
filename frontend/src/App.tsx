import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './shared/components/ThemeContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { PermissionsProvider } from './features/permissions/PermissionsContext';
import { Layout } from './shared/components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { CompleteProfilePage } from './features/auth/CompleteProfilePage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ResourcesPage } from './features/resources/ResourcesPage';
import { PermissionsPage } from './features/permissions/PermissionsPage';
import { SOCPage } from './features/soc/SOCPage';
import { APIPage } from './features/api/APIPage';
import { Error403Page } from './features/errors/Error403Page';
import { Error404Page } from './features/errors/Error404Page';
import { Error500Page } from './features/errors/Error500Page';
import { PermissionGuard } from './features/permissions/PermissionGuard';
import { ErrorHandler } from './features/errors/ErrorHandler';
import { useRedirect } from './features/auth/useRedirect';
import { saveRedirect } from './features/auth/redirect';

// Component to handle redirect to login with saved location
function CompleteProfileRedirect() {
  const { redirectToLogin } = useRedirect();
  React.useEffect(() => {
    redirectToLogin();
  }, [redirectToLogin]);
  return null;
}

// Component to handle redirect for already authenticated users accessing login
function LoginRedirect() {
  const { redirectAfterLogin } = useRedirect();
  React.useEffect(() => {
    // If user is already logged in, redirect to saved location or dashboard
    redirectAfterLogin('/dashboard');
  }, [redirectAfterLogin]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { redirectToLogin } = useRedirect();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-[#FAFAFA]"></div>
      </div>
    );
  }

  if (!user) {
    // Save current location before redirecting to login
    redirectToLogin();
    return null; // Return null while redirecting
  }

  // Block pending users - they have the same access as outsiders
  if (user.approvalStatus === 'PENDING') {
    // Save current location before logging out, so user can return after approval
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/login' && currentPath !== '/complete-profile') {
      saveRedirect(currentPath, window.location.search);
    }
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
      <Route 
        path="/login" 
        element={
          user ? (
            <LoginRedirect />
          ) : (
            <LoginPage />
          )
        } 
      />
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
            <CompleteProfileRedirect />
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
        <Route path="dashboard" element={<ErrorHandler><DashboardPage /></ErrorHandler>} />
        <Route path="resources" element={<ErrorHandler><ResourcesPage /></ErrorHandler>} />
        <Route path="permissions" element={<ErrorHandler><PermissionsPage /></ErrorHandler>} />
        <Route 
          path="soc" 
          element={
            <PermissionGuard permission="soc.read" fallback={<Error403Page />}>
              <ErrorHandler>
                <SOCPage />
              </ErrorHandler>
            </PermissionGuard>
          } 
        />
        <Route 
          path="api" 
          element={
            <ErrorHandler>
              <APIPage />
            </ErrorHandler>
          } 
        />
        <Route path="students" element={<ErrorHandler><div>Students Page - Coming Soon</div></ErrorHandler>} />
        <Route path="settings" element={<ErrorHandler><div>Settings Page - Coming Soon</div></ErrorHandler>} />
      </Route>
      {/* Error pages */}
      <Route path="/error/403" element={<Error403Page />} />
      <Route path="/error/404" element={<Error404Page />} />
      <Route path="/error/500" element={<Error500Page />} />
      {/* Catch-all 404 route */}
      <Route path="*" element={<Error404Page />} />
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