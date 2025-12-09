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
      { resource: 'search', action: 'read', method: 'GET', path: '/api/search/pages', description: 'Search pages', descriptionHebrew: 'חיפוש דפים' },
      { resource: 'search', action: 'read', method: 'GET', path: '/api/search/pages/search', description: 'Search pages by query', descriptionHebrew: 'חיפוש דפים לפי שאילתה' },
      { resource: 'search', action: 'read', method: 'GET', path: '/api/search/pages/categories', description: 'Get pages by category', descriptionHebrew: 'קבלת דפים לפי קטגוריה' },
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
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts', description: 'List all cohorts (for student context)', descriptionHebrew: 'רשימת כל המחזורים (הקשר תלמידים)' },
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts/:id', description: 'Get cohort by ID (for student context)', descriptionHebrew: 'קבלת מחזור לפי מזהה (הקשר תלמידים)' },
    ],
    editAPIs: [
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students', description: 'Create new student', descriptionHebrew: 'יצירת תלמיד חדש' },
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students/upload', description: 'Upload students from file', descriptionHebrew: 'העלאת תלמידים מקובץ' },
      { resource: 'students', action: 'update', method: 'PUT', path: '/api/students/:id', description: 'Update student', descriptionHebrew: 'עדכון תלמיד' },
      { resource: 'students', action: 'delete', method: 'DELETE', path: '/api/students/:id', description: 'Delete student', descriptionHebrew: 'מחיקת תלמיד' },
      { resource: 'tracks', action: 'read', method: 'GET', path: '/api/tracks/:id', description: 'Get track by ID (for editing students)', descriptionHebrew: 'קבלת מגמה לפי מזהה (לעריכת תלמידים)' },
      { resource: 'tracks', action: 'create', method: 'POST', path: '/api/tracks', description: 'Create track', descriptionHebrew: 'יצירת מגמה' },
      { resource: 'tracks', action: 'update', method: 'PUT', path: '/api/tracks/:id', description: 'Update track', descriptionHebrew: 'עדכון מגמה' },
      { resource: 'tracks', action: 'delete', method: 'DELETE', path: '/api/tracks/:id', description: 'Delete track', descriptionHebrew: 'מחיקת מגמה' },
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts/:id', description: 'Get cohort by ID (for editing students)', descriptionHebrew: 'קבלת מחזור לפי מזהה (לעריכת תלמידים)' },
      { resource: 'cohorts', action: 'update', method: 'PUT', path: '/api/cohorts/:id', description: 'Update cohort', descriptionHebrew: 'עדכון מחזור' },
      { resource: 'cohorts', action: 'update', method: 'POST', path: '/api/cohorts/refresh', description: 'Refresh cohorts', descriptionHebrew: 'רענון מחזורים' },
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
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles/:id/permissions', description: 'Get role permissions', descriptionHebrew: 'קבלת הרשאות תפקיד' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms', description: 'List all rooms', descriptionHebrew: 'רשימת כל החדרים' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms/:id', description: 'Get room by ID', descriptionHebrew: 'קבלת חדר לפי מזהה' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments/:id/commanders', description: 'Get department commanders', descriptionHebrew: 'קבלת מפקדי מחלקה' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/pages', description: 'List all page permissions', descriptionHebrew: 'רשימת כל הרשאות הדפים' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/users/:userId/page-permissions', description: 'Get user page permissions', descriptionHebrew: 'קבלת הרשאות דפים של משתמש' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions', description: 'List all permissions', descriptionHebrew: 'רשימת כל ההרשאות' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/:id', description: 'Get permission by ID', descriptionHebrew: 'קבלת הרשאה לפי מזהה' },
      { resource: 'auth', action: 'read', method: 'GET', path: '/api/auth/created', description: 'Get created users (admin)', descriptionHebrew: 'קבלת משתמשים שנוצרו (מנהל מערכת)' },
      { resource: 'auth', action: 'read', method: 'GET', path: '/api/auth/pending', description: 'Get pending users (admin)', descriptionHebrew: 'קבלת משתמשים ממתינים (מנהל מערכת)' },
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
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/roles/:roleId/revoke-page', description: 'Revoke page permission from role', descriptionHebrew: 'שלילת הרשאת דף מתפקיד' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/bulk-grant-page', description: 'Bulk grant page permissions to user', descriptionHebrew: 'הענקת הרשאות דפים מרובות למשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/roles/:roleId/bulk-grant-page', description: 'Bulk grant page permissions to role', descriptionHebrew: 'הענקת הרשאות דפים מרובות לתפקיד' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/grant-custom-mode', description: 'Grant custom mode permission to user', descriptionHebrew: 'הענקת הרשאת מצב מותאם למשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/revoke-custom-mode', description: 'Revoke custom mode permission from user', descriptionHebrew: 'שלילת הרשאת מצב מותאם ממשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/roles/:roleId/grant-custom-mode', description: 'Grant custom mode permission to role', descriptionHebrew: 'הענקת הרשאת מצב מותאם לתפקיד' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/roles/:roleId/revoke-custom-mode', description: 'Revoke custom mode permission from role', descriptionHebrew: 'שלילת הרשאת מצב מותאם מתפקיד' },
      { resource: 'permissions', action: 'create', method: 'POST', path: '/api/permissions', description: 'Create new permission', descriptionHebrew: 'יצירת הרשאה חדשה' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/users/:userId', description: 'Get user permissions', descriptionHebrew: 'קבלת הרשאות משתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/grant', description: 'Grant permission to user', descriptionHebrew: 'הענקת הרשאה למשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/revoke', description: 'Revoke permission from user', descriptionHebrew: 'שלילת הרשאה ממשתמש' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/roles/:roleId/page-permissions', description: 'Get role page permissions', descriptionHebrew: 'קבלת הרשאות דפים של תפקיד' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/:permissionId/users', description: 'Get users with permission', descriptionHebrew: 'קבלת משתמשים עם הרשאה' },
      { resource: 'roles', action: 'update', method: 'POST', path: '/api/roles/:id/permissions/grant', description: 'Grant permission to role', descriptionHebrew: 'הענקת הרשאה לתפקיד' },
      { resource: 'roles', action: 'update', method: 'POST', path: '/api/roles/:id/permissions/revoke', description: 'Revoke permission from role', descriptionHebrew: 'שלילת הרשאה מתפקיד' },
      { resource: 'auth', action: 'create', method: 'POST', path: '/api/auth/create-user', description: 'Create new user (admin)', descriptionHebrew: 'יצירת משתמש חדש (מנהל מערכת)' },
      { resource: 'auth', action: 'update', method: 'POST', path: '/api/auth/:id/approve', description: 'Approve user (admin)', descriptionHebrew: 'אישור משתמש (מנהל מערכת)' },
      { resource: 'auth', action: 'update', method: 'POST', path: '/api/auth/:id/reject', description: 'Reject user (admin)', descriptionHebrew: 'דחיית משתמש (מנהל מערכת)' },
      { resource: 'auth', action: 'update', method: 'POST', path: '/api/auth/:id/reset-password', description: 'Reset user password (admin)', descriptionHebrew: 'איפוס סיסמת משתמש (מנהל מערכת)' },
      { resource: 'auth', action: 'update', method: 'PUT', path: '/api/auth/:id', description: 'Update user (admin)', descriptionHebrew: 'עדכון משתמש (מנהל מערכת)' },
      { resource: 'auth', action: 'delete', method: 'DELETE', path: '/api/auth/:id', description: 'Delete user (admin)', descriptionHebrew: 'מחיקת משתמש (מנהל מערכת)' },
      { resource: 'students', action: 'delete', method: 'DELETE', path: '/api/students/clear-all', description: 'Clear all students (admin)', descriptionHebrew: 'מחיקת כל התלמידים (מנהל מערכת)' },
      { resource: 'students', action: 'update', method: 'POST', path: '/api/students/promote-all', description: 'Promote all cohorts (admin)', descriptionHebrew: 'קידום כל המחזורים (מנהל מערכת)' },
      { resource: 'students', action: 'update', method: 'POST', path: '/api/students/cohorts/:cohortId/promote', description: 'Promote cohort (admin)', descriptionHebrew: 'קידום מחזור (מנהל מערכת)' },
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
    detailedExplanation: 'הרשאה זו מאפשרת גישה למרכז פעילות אבטחה (SOC) של המערכת. עם הרשאת צפייה ניתן לראות לוגי ביקורת, סטטיסטיקות אבטחה, אירועי אבטחה, פעילות משתמשים, ומטריקות. עם הרשאת עריכה ניתן לעדכן אירועי אבטחה ולסמן אותם כאירועים.',
    category: 'security',
    categoryHebrew: 'אבטחה',
    viewAPIs: [
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/audit-logs', description: 'View audit logs', descriptionHebrew: 'צפייה בלוגי ביקורת' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/stats', description: 'View security statistics', descriptionHebrew: 'צפייה בסטטיסטיקות אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/incidents', description: 'View security incidents', descriptionHebrew: 'צפייה באירועי אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/alerts', description: 'View security alerts', descriptionHebrew: 'צפייה בהתראות אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/users/:userId/activity', description: 'View user activity', descriptionHebrew: 'צפייה בפעילות משתמש' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/resources/:resource/:resourceId', description: 'View resource history', descriptionHebrew: 'צפייה בהיסטוריית משאב' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/metrics', description: 'View security metrics', descriptionHebrew: 'צפייה במטריקות אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/export/logs', description: 'Export audit logs', descriptionHebrew: 'ייצוא לוגי ביקורת' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/export/stats', description: 'Export security statistics', descriptionHebrew: 'ייצוא סטטיסטיקות אבטחה' },
    ],
    editAPIs: [
      { resource: 'soc', action: 'update', method: 'PUT', path: '/api/soc/incidents/:id', description: 'Update security incident', descriptionHebrew: 'עדכון אירוע אבטחה' },
      { resource: 'soc', action: 'update', method: 'POST', path: '/api/soc/incidents/:id/mark', description: 'Mark as security incident', descriptionHebrew: 'סימון כאירוע אבטחה' },
    ],
    supportsEditMode: true,
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
      { resource: 'api-keys', action: 'read', method: 'GET', path: '/api/api-keys', description: 'List user API keys', descriptionHebrew: 'רשימת מפתחות API של המשתמש' },
      { resource: 'api-keys', action: 'read', method: 'GET', path: '/api/api-keys/all', description: 'List all API keys (admin)', descriptionHebrew: 'רשימת כל מפתחות ה-API (מנהל מערכת)' },
      { resource: 'api-keys', action: 'read', method: 'GET', path: '/api/api-keys/:id', description: 'Get API key by ID', descriptionHebrew: 'קבלת מפתח API לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'api-keys', action: 'create', method: 'POST', path: '/api/api-keys', description: 'Create new API key', descriptionHebrew: 'יצירת מפתח API חדש' },
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

  // Tracks Management - ניהול מגמות
  'tracks': {
    page: 'tracks',
    displayName: 'Tracks',
    displayNameHebrew: 'מגמות',
    description: 'Manage educational tracks',
    descriptionHebrew: 'ניהול מגמות לימודיות',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של מגמות לימודיות במערכת. עם הרשאת צפייה ניתן לראות רשימת מגמות, פרטי מגמה ספציפית, ותלמידים המשויכים למגמה. עם הרשאת עריכה ניתן להוסיף מגמות חדשות, לעדכן פרטי מגמות קיימות, ולמחוק מגמות.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'tracks', action: 'read', method: 'GET', path: '/api/tracks', description: 'List all tracks', descriptionHebrew: 'רשימת כל המגמות' },
      { resource: 'tracks', action: 'read', method: 'GET', path: '/api/tracks/:id', description: 'Get track by ID', descriptionHebrew: 'קבלת מגמה לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'tracks', action: 'create', method: 'POST', path: '/api/tracks', description: 'Create new track', descriptionHebrew: 'יצירת מגמה חדשה' },
      { resource: 'tracks', action: 'update', method: 'PUT', path: '/api/tracks/:id', description: 'Update track', descriptionHebrew: 'עדכון מגמה' },
      { resource: 'tracks', action: 'delete', method: 'DELETE', path: '/api/tracks/:id', description: 'Delete track', descriptionHebrew: 'מחיקת מגמה' },
    ],
    supportsEditMode: true,
  },

  // Cohorts Management - ניהול מחזורים
  'cohorts': {
    page: 'cohorts',
    displayName: 'Cohorts',
    displayNameHebrew: 'מחזורים',
    description: 'Manage student cohorts',
    descriptionHebrew: 'ניהול מחזורי תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של מחזורי תלמידים במערכת. עם הרשאת צפייה ניתן לראות רשימת מחזורים, פרטי מחזור ספציפי, ותלמידים המשויכים למחזור. עם הרשאת עריכה ניתן להוסיף מחזורים חדשים, לעדכן פרטי מחזורים קיימים, ולמחוק מחזורים.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts', description: 'List all cohorts', descriptionHebrew: 'רשימת כל המחזורים' },
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts/:id', description: 'Get cohort by ID', descriptionHebrew: 'קבלת מחזור לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'cohorts', action: 'create', method: 'POST', path: '/api/cohorts', description: 'Create new cohort', descriptionHebrew: 'יצירת מחזור חדש' },
      { resource: 'cohorts', action: 'update', method: 'PUT', path: '/api/cohorts/:id', description: 'Update cohort', descriptionHebrew: 'עדכון מחזור' },
      { resource: 'cohorts', action: 'update', method: 'POST', path: '/api/cohorts/refresh', description: 'Refresh cohorts', descriptionHebrew: 'רענון מחזורים' },
    ],
    supportsEditMode: true,
  },

  // Classes Management - ניהול כיתות
  'classes': {
    page: 'classes',
    displayName: 'Classes',
    displayNameHebrew: 'כיתות',
    description: 'Manage classes',
    descriptionHebrew: 'ניהול כיתות',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של כיתות במערכת. עם הרשאת צפייה ניתן לראות רשימת כיתות, פרטי כיתה ספציפית, ותלמידים המשויכים לכיתה. עם הרשאת עריכה ניתן להוסיף כיתות חדשות, לעדכן פרטי כיתות קיימות, ולמחוק כיתות.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'classes', action: 'read', method: 'GET', path: '/api/classes', description: 'List all classes', descriptionHebrew: 'רשימת כל הכיתות' },
      { resource: 'classes', action: 'read', method: 'GET', path: '/api/classes/:id', description: 'Get class by ID', descriptionHebrew: 'קבלת כיתה לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'classes', action: 'create', method: 'POST', path: '/api/classes', description: 'Create new class', descriptionHebrew: 'יצירת כיתה חדשה' },
      { resource: 'classes', action: 'update', method: 'PUT', path: '/api/classes/:id', description: 'Update class', descriptionHebrew: 'עדכון כיתה' },
      { resource: 'classes', action: 'delete', method: 'DELETE', path: '/api/classes/:id', description: 'Delete class', descriptionHebrew: 'מחיקת כיתה' },
    ],
    supportsEditMode: true,
  },

  // Student Exits Management - ניהול יציאות תלמידים
  'student-exits': {
    page: 'student-exits',
    displayName: 'Student Exits',
    displayNameHebrew: 'יציאות תלמידים',
    description: 'Manage student exits and transfers',
    descriptionHebrew: 'ניהול יציאות והעברות תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של יציאות והעברות תלמידים במערכת. עם הרשאת צפייה ניתן לראות רשימת יציאות תלמידים, פרטי יציאה ספציפית, ויציאות לפי תלמיד. עם הרשאת עריכה ניתן להוסיף רשומות יציאה חדשות, לעדכן פרטי יציאות קיימות, ולמחוק רשומות יציאה.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'student-exits', action: 'read', method: 'GET', path: '/api/student-exits', description: 'List all student exits', descriptionHebrew: 'רשימת כל יציאות התלמידים' },
      { resource: 'student-exits', action: 'read', method: 'GET', path: '/api/student-exits/student/:studentId', description: 'Get student exits by student ID', descriptionHebrew: 'קבלת יציאות תלמיד לפי מזהה תלמיד' },
    ],
    editAPIs: [
      { resource: 'student-exits', action: 'create', method: 'POST', path: '/api/student-exits', description: 'Create new student exit record', descriptionHebrew: 'יצירת רשומת יציאת תלמיד חדשה' },
      { resource: 'student-exits', action: 'update', method: 'PUT', path: '/api/student-exits/:studentId', description: 'Update student exit record', descriptionHebrew: 'עדכון רשומת יציאת תלמיד' },
    ],
    supportsEditMode: true,
  },
};

/**
 * Get unique API permissions from a list (deduplicates by resource:action)
 * Helper function to prevent showing the same permission multiple times
 */
export function getUniqueAPIPermissions(apis: APIPermission[]): APIPermission[] {
  const uniquePermissions = new Map<string, APIPermission>();
  for (const api of apis) {
    const key = `${api.resource}:${api.action}`;
    // Keep first occurrence, but prefer Hebrew description if available
    if (!uniquePermissions.has(key)) {
      uniquePermissions.set(key, api);
    } else {
      const existing = uniquePermissions.get(key)!;
      // Prefer API with Hebrew description
      if (api.descriptionHebrew && !existing.descriptionHebrew) {
        uniquePermissions.set(key, api);
      }
    }
  }
  return Array.from(uniquePermissions.values());
}

/**
 * Get all API permissions for a page permission
 * Returns unique permissions by resource:action (deduplicated)
 * This prevents showing the same permission multiple times when multiple endpoints share the same resource:action
 * 
 * Example: If a page has 4 endpoints all with resource='soc', action='read',
 * this function will return only one 'soc:read' permission instead of 4 duplicates.
 */
export function getAPIPermissionsForPage(page: string, action: 'view' | 'edit'): APIPermission[] {
  const pagePermission = PAGE_PERMISSIONS[page];
  if (!pagePermission) {
    return [];
  }

  const allAPIs = action === 'view' 
    ? pagePermission.viewAPIs
    : [...pagePermission.viewAPIs, ...pagePermission.editAPIs];

  return getUniqueAPIPermissions(allAPIs);
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

