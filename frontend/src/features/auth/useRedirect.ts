import { useNavigate, useLocation } from 'react-router-dom';
import { saveRedirect, getAndClearRedirect, clearRedirect } from './redirect';

/**
 * Hook for managing authenticated redirects
 * Provides clean API for redirect flow similar to enterprise applications
 */
export function useRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Redirects to login and saves the current location for post-login redirect
   */
  const redirectToLogin = () => {
    const currentPath = location.pathname + location.search;
    
    // Don't save redirect for login page itself
    if (currentPath !== '/login') {
      saveRedirect(currentPath, location.search);
    }
    
    navigate('/login', { replace: true });
  };

  /**
   * Redirects to the saved location (if exists) or a default path
   * @param defaultPath - Default path to redirect to if no saved redirect exists
   */
  const redirectAfterLogin = (defaultPath: string = '/dashboard') => {
    const savedRedirect = getAndClearRedirect();
    
    if (savedRedirect && savedRedirect !== '/login') {
      navigate(savedRedirect, { replace: true });
    } else {
      navigate(defaultPath, { replace: true });
    }
  };

  /**
   * Clears any saved redirect
   */
  const clearSavedRedirect = () => {
    clearRedirect();
  };

  return {
    redirectToLogin,
    redirectAfterLogin,
    clearSavedRedirect,
  };
}
