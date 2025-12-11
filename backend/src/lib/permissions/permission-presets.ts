/**
 * Permission Presets - תבניות הרשאות מוגדרות מראש
 * 
 * תבניות אלה מאפשרות להחיל הרשאות מוגדרות מראש על משתמשים או תפקידים
 * בצורה מהירה ונוחה, במקום להגדיר כל הרשאה בנפרד.
 */

import { PAGE_PERMISSIONS } from './permission-registry';

export interface PermissionPreset {
  id: string;
  name: string;
  nameHebrew: string;
  description: string;
  descriptionHebrew: string;
  permissions: Array<{
    page: string;
    action: 'view' | 'edit';
  }>;
}

/**
 * תבניות הרשאות מוגדרות מראש
 */
export const PERMISSION_PRESETS: Record<string, PermissionPreset> = {
  // מורה - Teacher
  'teacher': {
    id: 'teacher',
    name: 'Teacher',
    nameHebrew: 'מורה',
    description: 'Standard teacher permissions - can view and manage students',
    descriptionHebrew: 'הרשאות מורה סטנדרטיות - יכול לצפות ולנהל תלמידים',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'edit' },
    ],
  },

  // יועצת - Counselor
  'counselor': {
    id: 'counselor',
    name: 'Counselor',
    nameHebrew: 'יועצת',
    description: 'Counselor permissions - can view students and SOC',
    descriptionHebrew: 'הרשאות יועצת - יכולה לצפות בתלמידים ובמרכז אבטחה',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'view' },
      { page: 'soc', action: 'view' },
    ],
  },

  // מנהל - Administrator
  'administrator': {
    id: 'administrator',
    name: 'Administrator',
    nameHebrew: 'מנהל',
    description: 'Full administrator permissions - access to all pages',
    descriptionHebrew: 'הרשאות מנהל מלאות - גישה לכל הדפים',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'edit' },
      { page: 'resources', action: 'edit' },
      { page: 'soc', action: 'edit' },
      { page: 'api-keys', action: 'edit' },
      { page: 'settings', action: 'view' },
    ],
  },

  // מפקד - Commander
  'commander': {
    id: 'commander',
    name: 'Commander',
    nameHebrew: 'מפקד',
    description: 'Commander permissions - can view and manage resources',
    descriptionHebrew: 'הרשאות מפקד - יכול לצפות ולנהל משאבים',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'view' },
      { page: 'resources', action: 'edit' },
      { page: 'soc', action: 'view' },
    ],
  },

  // צופה - Viewer
  'viewer': {
    id: 'viewer',
    name: 'Viewer',
    nameHebrew: 'צופה',
    description: 'View-only permissions - can only view pages, no editing',
    descriptionHebrew: 'הרשאות צפייה בלבד - יכול רק לצפות בדפים, ללא עריכה',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'view' },
      { page: 'soc', action: 'view' },
    ],
  },

  // מפתח API - API Developer
  'api-developer': {
    id: 'api-developer',
    name: 'API Developer',
    nameHebrew: 'מפתח API',
    description: 'API developer permissions - can manage API keys',
    descriptionHebrew: 'הרשאות מפתח API - יכול לנהל מפתחות API',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'api-keys', action: 'edit' },
    ],
  },
};

/**
 * קבלת תבנית הרשאות לפי ID
 */
export function getPreset(presetId: string): PermissionPreset | undefined {
  return PERMISSION_PRESETS[presetId];
}

/**
 * קבלת כל התבניות
 */
export function getAllPresets(): PermissionPreset[] {
  return Object.values(PERMISSION_PRESETS);
}

/**
 * בדיקה אם תבנית קיימת
 */
export function presetExists(presetId: string): boolean {
  return presetId in PERMISSION_PRESETS;
}

/**
 * קבלת רשימת כל ה-IDs של התבניות
 */
export function getPresetIds(): string[] {
  return Object.keys(PERMISSION_PRESETS);
}
