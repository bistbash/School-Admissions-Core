import { PermissionsService } from '../permissions/permissions.service';
import { prisma } from '../../lib/prisma';

const permissionsService = new PermissionsService();

/**
 * Define all available pages/routes in the system
 * Each page has a resource and action that determines access
 */
export interface PageDefinition {
  path: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  icon?: string;
  category?: string;
}

const AVAILABLE_PAGES: PageDefinition[] = [
  {
    path: '/dashboard',
    name: 'לוח בקרה',
    description: 'סקירה כללית של המערכת',
    resource: 'dashboard',
    action: 'read',
    icon: 'LayoutDashboard',
    category: 'כללי',
  },
  {
    path: '/resources',
    name: 'ניהול משאבים',
    description: 'ניהול משתמשים, מחלקות וחדרים',
    resource: 'resources',
    action: 'read',
    icon: 'Users',
    category: 'ניהול',
  },
  {
    path: '/students',
    name: 'תלמידים',
    description: 'ניהול תלמידים',
    resource: 'students',
    action: 'read',
    icon: 'GraduationCap',
    category: 'תלמידים',
  },
  {
    path: '/cohorts',
    name: 'מחזורים',
    description: 'ניהול מחזורים',
    resource: 'cohorts',
    action: 'read',
    icon: 'Users',
    category: 'תלמידים',
  },
  {
    path: '/classes',
    name: 'כיתות',
    description: 'ניהול כיתות',
    resource: 'classes',
    action: 'read',
    icon: 'School',
    category: 'תלמידים',
  },
  {
    path: '/student-exits',
    name: 'יציאות תלמידים',
    description: 'ניהול יציאות תלמידים',
    resource: 'student-exits',
    action: 'read',
    icon: 'LogOut',
    category: 'תלמידים',
  },
  {
    path: '/settings',
    name: 'הגדרות',
    description: 'הגדרות המערכת',
    resource: 'settings',
    action: 'read',
    icon: 'Settings',
    category: 'כללי',
  },
  {
    path: '/permissions',
    name: 'ניהול הרשאות',
    description: 'ניהול הרשאות למשתמשים ותפקידים',
    resource: 'permissions',
    action: 'manage',
    icon: 'Shield',
    category: 'ניהול',
  },
];

export class SearchService {
  /**
   * Search for pages that the user has access to
   */
  async searchPages(userId: number, query: string): Promise<PageDefinition[]> {
    // Get user permissions
    const userPermissions = await permissionsService.getUserPermissions(userId);
    const permissionSet = new Set(userPermissions.map(p => `${p.resource}.${p.action}`));

    // Check if user is admin (admins have access to all pages)
    const user = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    const isAdmin = user?.isAdmin || false;

    // Filter pages based on permissions
    const accessiblePages = AVAILABLE_PAGES.filter(page => {
      // Admins have access to all pages
      if (isAdmin) {
        return true;
      }

      // Check if user has permission for this page
      const permissionKey = `${page.resource}.${page.action}`;
      return permissionSet.has(permissionKey);
    });

    // Filter by search query if provided
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      return accessiblePages.filter(page => {
        return (
          page.name.toLowerCase().includes(lowerQuery) ||
          page.description.toLowerCase().includes(lowerQuery) ||
          page.path.toLowerCase().includes(lowerQuery) ||
          (page.category && page.category.toLowerCase().includes(lowerQuery))
        );
      });
    }

    return accessiblePages;
  }

  /**
   * Get all pages accessible to the user (for navigation)
   */
  async getAllAccessiblePages(userId: number): Promise<PageDefinition[]> {
    return this.searchPages(userId, '');
  }

  /**
   * Get pages grouped by category
   */
  async getPagesByCategory(userId: number): Promise<Record<string, PageDefinition[]>> {
    const pages = await this.getAllAccessiblePages(userId);
    const grouped: Record<string, PageDefinition[]> = {};

    pages.forEach(page => {
      const category = page.category || 'אחר';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(page);
    });

    return grouped;
  }
}
