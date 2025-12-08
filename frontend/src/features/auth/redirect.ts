/**
 * Redirect Management System
 * Handles storing and retrieving intended destinations for authenticated redirects
 * Inspired by enterprise-level redirect patterns
 */

const REDIRECT_KEY = 'auth_redirect';
const MAX_REDIRECT_AGE = 10 * 60 * 1000; // 10 minutes

interface RedirectState {
  path: string;
  timestamp: number;
  search?: string;
}

/**
 * Stores the intended destination before redirecting to login
 * @param path - The path the user was trying to access
 * @param search - Optional query string parameters
 */
export function saveRedirect(path: string, search?: string): void {
  if (typeof window === 'undefined') return;
  
  const redirectState: RedirectState = {
    path,
    timestamp: Date.now(),
    search,
  };
  
  try {
    sessionStorage.setItem(REDIRECT_KEY, JSON.stringify(redirectState));
  } catch (error) {
    console.warn('Failed to save redirect:', error);
  }
}

/**
 * Retrieves and clears the saved redirect destination
 * @returns The saved path with search params, or null if none exists or expired
 */
export function getAndClearRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(REDIRECT_KEY);
    if (!stored) return null;
    
    const redirectState: RedirectState = JSON.parse(stored);
    
    // Check if redirect is expired
    const age = Date.now() - redirectState.timestamp;
    if (age > MAX_REDIRECT_AGE) {
      sessionStorage.removeItem(REDIRECT_KEY);
      return null;
    }
    
    // Clear the redirect after retrieving
    sessionStorage.removeItem(REDIRECT_KEY);
    
    // Build full path with search params
    const fullPath = redirectState.search 
      ? `${redirectState.path}${redirectState.search}`
      : redirectState.path;
    
    return fullPath;
  } catch (error) {
    console.warn('Failed to retrieve redirect:', error);
    sessionStorage.removeItem(REDIRECT_KEY);
    return null;
  }
}

/**
 * Clears any saved redirect without retrieving it
 */
export function clearRedirect(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch (error) {
    console.warn('Failed to clear redirect:', error);
  }
}

/**
 * Checks if there's a saved redirect
 */
export function hasRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = sessionStorage.getItem(REDIRECT_KEY);
    if (!stored) return false;
    
    const redirectState: RedirectState = JSON.parse(stored);
    const age = Date.now() - redirectState.timestamp;
    
    // Return false if expired
    if (age > MAX_REDIRECT_AGE) {
      sessionStorage.removeItem(REDIRECT_KEY);
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current location path with search params
 */
export function getCurrentLocation(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}
