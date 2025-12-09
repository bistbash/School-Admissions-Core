/**
 * Permission Policies
 * 
 * This file defines permission policies that can be applied to API requests.
 * Each policy is responsible for a specific access control rule.
 * 
 * Policies are checked in priority order (higher priority = checked first).
 * If a policy allows access, the request is granted. Otherwise, the next policy is checked.
 * 
 * This approach provides:
 * - Clear separation of concerns
 * - Easy to test individual policies
 * - Easy to add new policies
 * - Maintainable and readable code
 */


/**
 * Permission context passed to policies
 */
export interface PermissionContext {
  userId: number;
  method: string;
  path: string;
  approvalStatus: 'CREATED' | 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  isAdmin: boolean;
  authType: 'JWT' | 'API_KEY';
}

/**
 * Permission policy interface
 */
export interface PermissionPolicy {
  name: string;
  priority: number; // Higher priority = checked first
  check: (context: PermissionContext) => Promise<boolean> | boolean;
  description: string;
}

/**
 * Endpoint configuration
 */
export interface EndpointConfig {
  method: string;
  path: string;
  description?: string;
}

/**
 * Normalize path for comparison
 */
function normalizePath(path: string): string {
  let normalized = path.split('?')[0].replace(/\/$/, '');
  if (!normalized.startsWith('/api')) {
    normalized = '/api' + normalized;
  }
  return normalized;
}

/**
 * Profile completion endpoints - accessible to CREATED/PENDING users
 */
const PROFILE_COMPLETION_ENDPOINTS: EndpointConfig[] = [
  { method: 'GET', path: '/api/roles' },
  { method: 'GET', path: '/api/departments' },
  { method: 'POST', path: '/api/auth/complete-profile' },
];

/**
 * Public reference data endpoints - accessible to all APPROVED users
 */
const PUBLIC_REFERENCE_ENDPOINTS: EndpointConfig[] = [
  { method: 'GET', path: '/api/roles' },
  { method: 'GET', path: '/api/departments' },
];

/**
 * Self-access endpoints - accessible to all APPROVED users
 */
const SELF_ACCESS_ENDPOINTS: EndpointConfig[] = [
  { method: 'GET', path: '/api/permissions/my-permissions' },
  { method: 'GET', path: '/api/permissions/my-page-permissions' },
  { method: 'GET', path: '/api/permissions/pages' },
  { method: 'GET', path: '/api/auth/me' },
];

/**
 * Admin Policy - Highest priority
 * Admins have full access to everything
 */
export const adminPolicy: PermissionPolicy = {
  name: 'admin',
  priority: 100,
  description: 'Admin users have full access to all endpoints',
  check: (context: PermissionContext) => {
    return context.isAdmin;
  },
};

/**
 * Profile Completion Policy
 * Allows CREATED/PENDING users to access endpoints needed for profile completion
 */
export const profileCompletionPolicy: PermissionPolicy = {
  name: 'profile-completion',
  priority: 50,
  description: 'CREATED/PENDING users can access profile completion endpoints',
  check: (context: PermissionContext) => {
    if (context.approvalStatus !== 'CREATED' && context.approvalStatus !== 'PENDING') {
      return false;
    }
    
    const normalizedPath = normalizePath(context.path);
    return PROFILE_COMPLETION_ENDPOINTS.some(endpoint => 
      endpoint.method === context.method && 
      (normalizedPath === endpoint.path || normalizedPath.startsWith(endpoint.path + '/'))
    );
  },
};

/**
 * Public Reference Data Policy
 * Allows APPROVED users to access basic reference data endpoints
 */
export const publicReferencePolicy: PermissionPolicy = {
  name: 'public-reference',
  priority: 40,
  description: 'APPROVED users can access public reference data endpoints',
  check: (context: PermissionContext) => {
    if (context.approvalStatus !== 'APPROVED') {
      return false;
    }
    
    const normalizedPath = normalizePath(context.path);
    return PUBLIC_REFERENCE_ENDPOINTS.some(endpoint => 
      endpoint.method === context.method && 
      (normalizedPath === endpoint.path || normalizedPath.startsWith(endpoint.path + '/'))
    );
  },
};

/**
 * Self-Access Policy
 * Allows APPROVED users to access endpoints to view their own information
 */
export const selfAccessPolicy: PermissionPolicy = {
  name: 'self-access',
  priority: 40,
  description: 'APPROVED users can access self-access endpoints',
  check: (context: PermissionContext) => {
    if (context.approvalStatus !== 'APPROVED') {
      return false;
    }
    
    const normalizedPath = normalizePath(context.path);
    return SELF_ACCESS_ENDPOINTS.some(endpoint => 
      endpoint.method === context.method && 
      normalizedPath === endpoint.path
    );
  },
};

/**
 * Export all policies in priority order
 */
export const permissionPolicies: PermissionPolicy[] = [
  adminPolicy,
  profileCompletionPolicy,
  publicReferencePolicy,
  selfAccessPolicy,
].sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
