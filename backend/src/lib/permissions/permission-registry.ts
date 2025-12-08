/**
 * Enterprise Permission Registry
 * 
 * Defines all pages and their associated API endpoints.
 * When a user gets permission for a page (view/edit), they automatically
 * get permissions for the corresponding APIs.
 * 
 * Only includes pages that actually exist in the application.
 */

export interface CustomViewMode {
  id: string; // Unique identifier (e.g., 'teacher', 'counselor', 'student')
  name: string; // English name
  nameHebrew: string; // Hebrew name
  description: string; // English description
  descriptionHebrew: string; // Hebrew description
  viewAPIs?: APIPermission[]; // Optional: specific APIs for this mode
  editAPIs?: APIPermission[]; // Optional: specific APIs for this mode
}

export interface PagePermission {
  page: string;
  displayName: string;
  displayNameHebrew: string; // שם בעברית
  description: string;
  descriptionHebrew: string; // תיאור בעברית
  detailedExplanation: string; // הסבר מפורט מה ההרשאה עושה
  category: string;
  categoryHebrew: string; // קטגוריה בעברית
  viewAPIs: APIPermission[];
  editAPIs: APIPermission[];
  supportsEditMode?: boolean; // If false, this page doesn't have edit mode (view only)
  customModes?: CustomViewMode[]; // Optional: custom view modes (e.g., teacher, counselor, student)
}

export interface APIPermission {
  resource: string;
  action: string;
  method: string; // GET, POST, PUT, DELETE
  path: string; // e.g., /api/students
  description: string;
  descriptionHebrew: string; // תיאור בעברית
}

/**
 * Permission Registry - Maps pages to their API endpoints
 * Only includes pages that exist in the application
 */
export const PAGE_PERMISSIONS: Record<string, PagePermission> = {
  // Dashboard - לוח בקרה
  'dashboard': {
    page: 'dashboard',
    displayName: 'Dashboard',
    displayNameHebrew: 'לוח בקרה',
    description: 'View dashboard and statistics',
    descriptionHebrew: 'צפייה בלוח הבקרה וסטטיסטיקות',
    detailedExplanation: 'הרשאה זו מאפשרת למשתמש לגשת לדף הבית של המערכת, לראות סטטיסטיקות כלליות, מידע אישי, וסיכום פעילות. זו הרשאה בסיסית שכל משתמש מאושר צריך לקבל.',
    category: 'general',
    categoryHebrew: 'כללי',
    viewAPIs: [
      { resource: 'dashboard', action: 'read', method: 'GET', path: '/api/auth/me', description: 'Get current user info', descriptionHebrew: 'קבלת מידע על המשתמש הנוכחי' },
    ],
    editAPIs: [],
    supportsEditMode: false, // Dashboard is view-only
  },

  // Students Management - תלמידים
  'students': {
    page: 'students',
    displayName: 'Students',
    displayNameHebrew: 'תלמידים',
    description: 'Manage students',
    descriptionHebrew: 'ניהול תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של תלמידים במערכת. עם הרשאת צפייה ניתן לראות רשימת תלמידים, פרטי תלמיד ספציפי, וחיפוש לפי מספר זהות. עם הרשאת עריכה ניתן להוסיף תלמידים חדשים, לעדכן פרטי תלמידים קיימים, ולמחוק תלמידים.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students', description: 'List all students', descriptionHebrew: 'רשימת כל התלמידים' },
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students/:id', description: 'Get student by ID', descriptionHebrew: 'קבלת תלמיד לפי מזהה' },
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students/id-number/:idNumber', description: 'Get student by ID number', descriptionHebrew: 'קבלת תלמיד לפי מספר זהות' },
      { resource: 'tracks', action: 'read', method: 'GET', path: '/api/tracks', description: 'List tracks (for student context)', descriptionHebrew: 'רשימת מגמות (הקשר תלמידים)' },
    ],
    editAPIs: [
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students', description: 'Create new student', descriptionHebrew: 'יצירת תלמיד חדש' },
      { resource: 'students', action: 'update', method: 'PUT', path: '/api/students/:id', description: 'Update student', descriptionHebrew: 'עדכון תלמיד' },
      { resource: 'students', action: 'delete', method: 'DELETE', path: '/api/students/:id', description: 'Delete student', descriptionHebrew: 'מחיקת תלמיד' },
      { resource: 'tracks', action: 'create', method: 'POST', path: '/api/tracks', description: 'Create track', descriptionHebrew: 'יצירת מגמה' },
      { resource: 'tracks', action: 'update', method: 'PUT', path: '/api/tracks/:id', description: 'Update track', descriptionHebrew: 'עדכון מגמה' },
      { resource: 'tracks', action: 'delete', method: 'DELETE', path: '/api/tracks/:id', description: 'Delete track', descriptionHebrew: 'מחיקת מגמה' },
    ],
    supportsEditMode: true,
  },

  // Resources Management - ניהול משאבים
  'resources': {
    page: 'resources',
    displayName: 'Resources',
    displayNameHebrew: 'ניהול משאבים',
    description: 'Manage system resources (users, departments, rooms, roles)',
    descriptionHebrew: 'ניהול משאבי המערכת (משתמשים, מחלקות, חדרים, תפקידים)',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של משאבי המערכת. עם הרשאת צפייה ניתן לראות רשימת משתמשים, מחלקות, חדרים ותפקידים. עם הרשאת עריכה ניתן להוסיף, לעדכן ולמחוק משאבים אלה. בנוסף, ניתן לנהל הרשאות דפים למשתמשים ותפקידים.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'soldiers', action: 'read', method: 'GET', path: '/api/soldiers', description: 'List all users', descriptionHebrew: 'רשימת כל המשתמשים' },
      { resource: 'soldiers', action: 'read', method: 'GET', path: '/api/soldiers/:id', description: 'Get user by ID', descriptionHebrew: 'קבלת משתמש לפי מזהה' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments', description: 'List all departments', descriptionHebrew: 'רשימת כל המחלקות' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments/:id', description: 'Get department by ID', descriptionHebrew: 'קבלת מחלקה לפי מזהה' },
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles', description: 'List all roles', descriptionHebrew: 'רשימת כל התפקידים' },
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles/:id', description: 'Get role by ID', descriptionHebrew: 'קבלת תפקיד לפי מזהה' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms', description: 'List all rooms', descriptionHebrew: 'רשימת כל החדרים' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms/:id', description: 'Get room by ID', descriptionHebrew: 'קבלת חדר לפי מזהה' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/pages', description: 'List all page permissions', descriptionHebrew: 'רשימת כל הרשאות הדפים' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/users/:userId/page-permissions', description: 'Get user page permissions', descriptionHebrew: 'קבלת הרשאות דפים של משתמש' },
    ],
    editAPIs: [
      { resource: 'soldiers', action: 'create', method: 'POST', path: '/api/soldiers', description: 'Create new user', descriptionHebrew: 'יצירת משתמש חדש' },
      { resource: 'soldiers', action: 'update', method: 'PUT', path: '/api/soldiers/:id', description: 'Update user', descriptionHebrew: 'עדכון משתמש' },
      { resource: 'soldiers', action: 'delete', method: 'DELETE', path: '/api/soldiers/:id', description: 'Delete user', descriptionHebrew: 'מחיקת משתמש' },
      { resource: 'departments', action: 'create', method: 'POST', path: '/api/departments', description: 'Create new department', descriptionHebrew: 'יצירת מחלקה חדשה' },
      { resource: 'departments', action: 'update', method: 'PUT', path: '/api/departments/:id', description: 'Update department', descriptionHebrew: 'עדכון מחלקה' },
      { resource: 'departments', action: 'delete', method: 'DELETE', path: '/api/departments/:id', description: 'Delete department', descriptionHebrew: 'מחיקת מחלקה' },
      { resource: 'rooms', action: 'create', method: 'POST', path: '/api/rooms', description: 'Create new room', descriptionHebrew: 'יצירת חדר חדש' },
      { resource: 'rooms', action: 'update', method: 'PUT', path: '/api/rooms/:id', description: 'Update room', descriptionHebrew: 'עדכון חדר' },
      { resource: 'rooms', action: 'delete', method: 'DELETE', path: '/api/rooms/:id', description: 'Delete room', descriptionHebrew: 'מחיקת חדר' },
      { resource: 'roles', action: 'create', method: 'POST', path: '/api/roles', description: 'Create new role', descriptionHebrew: 'יצירת תפקיד חדש' },
      { resource: 'roles', action: 'update', method: 'PUT', path: '/api/roles/:id', description: 'Update role', descriptionHebrew: 'עדכון תפקיד' },
      { resource: 'roles', action: 'delete', method: 'DELETE', path: '/api/roles/:id', description: 'Delete role', descriptionHebrew: 'מחיקת תפקיד' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/grant-page', description: 'Grant page permission to user', descriptionHebrew: 'הענקת הרשאת דף למשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/revoke-page', description: 'Revoke page permission from user', descriptionHebrew: 'שלילת הרשאת דף ממשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/roles/:roleId/grant-page', description: 'Grant page permission to role', descriptionHebrew: 'הענקת הרשאת דף לתפקיד' },
    ],
    supportsEditMode: true,
  },

  // SOC (Security Operations Center) - מרכז אבטחה
  'soc': {
    page: 'soc',
    displayName: 'Security Operations',
    displayNameHebrew: 'מרכז אבטחה',
    description: 'View security logs and incidents',
    descriptionHebrew: 'צפייה בלוגי אבטחה ואירועים',
    detailedExplanation: 'הרשאה זו מאפשרת גישה למרכז פעילות אבטחה (SOC) של המערכת. עם הרשאת צפייה ניתן לראות לוגי ביקורת, סטטיסטיקות אבטחה, ואירועי אבטחה.',
    category: 'security',
    categoryHebrew: 'אבטחה',
    viewAPIs: [
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/audit-logs', description: 'View audit logs', descriptionHebrew: 'צפייה בלוגי ביקורת' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/stats', description: 'View security statistics', descriptionHebrew: 'צפייה בסטטיסטיקות אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/incidents', description: 'View security incidents', descriptionHebrew: 'צפייה באירועי אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/alerts', description: 'View security alerts', descriptionHebrew: 'צפייה בהתראות אבטחה' },
    ],
    editAPIs: [],
    supportsEditMode: false, // SOC is view-only
  },

  // API Keys Management - מפתחות API
  'api-keys': {
    page: 'api-keys',
    displayName: 'API Keys',
    displayNameHebrew: 'מפתחות API',
    description: 'Manage API keys',
    descriptionHebrew: 'ניהול מפתחות API',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של מפתחות API במערכת. עם הרשאת צפייה ניתן לראות רשימת מפתחות API ופרטי מפתח ספציפי. עם הרשאת עריכה ניתן ליצור מפתחות API חדשים, לעדכן פרטי מפתחות קיימים, ולבטל מפתחות API.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'api-keys', action: 'read', method: 'GET', path: '/api/api-keys', description: 'List all API keys', descriptionHebrew: 'רשימת כל מפתחות ה-API' },
      { resource: 'api-keys', action: 'read', method: 'GET', path: '/api/api-keys/:id', description: 'Get API key by ID', descriptionHebrew: 'קבלת מפתח API לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'api-keys', action: 'create', method: 'POST', path: '/api/api-keys', description: 'Create new API key', descriptionHebrew: 'יצירת מפתח API חדש' },
      { resource: 'api-keys', action: 'update', method: 'PUT', path: '/api/api-keys/:id', description: 'Update API key', descriptionHebrew: 'עדכון מפתח API' },
      { resource: 'api-keys', action: 'delete', method: 'DELETE', path: '/api/api-keys/:id', description: 'Revoke API key', descriptionHebrew: 'ביטול מפתח API' },
    ],
    supportsEditMode: true, // API Keys can be managed with edit mode
  },

  // Settings - הגדרות
  'settings': {
    page: 'settings',
    displayName: 'Settings',
    displayNameHebrew: 'הגדרות',
    description: 'View and manage system settings',
    descriptionHebrew: 'צפייה וניהול הגדרות המערכת',
    detailedExplanation: 'הרשאה זו מאפשרת למשתמש לגשת לדף ההגדרות של המערכת. עם הרשאת צפייה ניתן לראות הגדרות כלליות של המערכת.',
    category: 'general',
    categoryHebrew: 'כללי',
    viewAPIs: [
      { resource: 'auth', action: 'read', method: 'GET', path: '/api/auth/me', description: 'Get current user info (for settings context)', descriptionHebrew: 'קבלת מידע על המשתמש הנוכחי (הקשר הגדרות)' },
    ],
    editAPIs: [],
    supportsEditMode: false, // Settings page is view-only until fully implemented
  },
};

/**
 * Get all API permissions for a page permission
 */
export function getAPIPermissionsForPage(page: string, action: 'view' | 'edit'): APIPermission[] {
  const pagePermission = PAGE_PERMISSIONS[page];
  if (!pagePermission) {
    return [];
  }

  if (action === 'view') {
    return pagePermission.viewAPIs;
  } else {
    // Edit includes both view and edit APIs
    return [...pagePermission.viewAPIs, ...pagePermission.editAPIs];
  }
}

/**
 * Get all pages in a category
 */
export function getPagesByCategory(category: string): PagePermission[] {
  return Object.values(PAGE_PERMISSIONS).filter(p => p.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  Object.values(PAGE_PERMISSIONS).forEach(p => categories.add(p.category));
  return Array.from(categories);
}

