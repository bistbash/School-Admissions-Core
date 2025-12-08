/**
 * Enterprise Permission Registry
 * 
 * Defines all pages and their associated API endpoints.
 * When a user gets permission for a page (view/edit), they automatically
 * get permissions for the corresponding APIs.
 */

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
  adminOnly?: boolean; // If true, only admins can edit this page
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
 */
export const PAGE_PERMISSIONS: Record<string, PagePermission> = {
  // Dashboard
  'dashboard': {
    page: 'dashboard',
    displayName: 'Dashboard',
    displayNameHebrew: 'דף בית',
    description: 'View dashboard and statistics',
    descriptionHebrew: 'צפייה בלוח הבקרה וסטטיסטיקות',
    detailedExplanation: 'הרשאה זו מאפשרת למשתמש לגשת לדף הבית של המערכת, לראות סטטיסטיקות כלליות, מידע אישי, וסיכום פעילות. זו הרשאה בסיסית שכל משתמש מאושר צריך לקבל.',
    category: 'general',
    categoryHebrew: 'כללי',
    viewAPIs: [
      { resource: 'dashboard', action: 'read', method: 'GET', path: '/api/auth/me', description: 'Get current user info', descriptionHebrew: 'קבלת מידע על המשתמש הנוכחי' },
    ],
    editAPIs: [],
  },

  // Students Management
  'students': {
    page: 'students',
    displayName: 'Students',
    displayNameHebrew: 'תלמידים',
    description: 'Manage students',
    descriptionHebrew: 'ניהול תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של תלמידים במערכת. עם הרשאת צפייה ניתן לראות רשימת תלמידים, פרטי תלמיד ספציפי, וחיפוש לפי מספר זהות. עם הרשאת עריכה ניתן להוסיף תלמידים חדשים, לעדכן פרטי תלמידים קיימים, ולמחוק תלמידים. רק אדמינים יכולים לערוך תלמידים.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students', description: 'List all students', descriptionHebrew: 'רשימת כל התלמידים' },
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students/:id', description: 'Get student by ID', descriptionHebrew: 'קבלת תלמיד לפי מזהה' },
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students/id-number/:idNumber', description: 'Get student by ID number', descriptionHebrew: 'קבלת תלמיד לפי מספר זהות' },
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts', description: 'List cohorts (for student context)', descriptionHebrew: 'רשימת מחזורים (הקשר תלמידים)' },
      { resource: 'classes', action: 'read', method: 'GET', path: '/api/classes', description: 'List classes (for student context)', descriptionHebrew: 'רשימת כיתות (הקשר תלמידים)' },
    ],
    editAPIs: [
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students', description: 'Create new student', descriptionHebrew: 'יצירת תלמיד חדש' },
      { resource: 'students', action: 'update', method: 'PUT', path: '/api/students/:id', description: 'Update student', descriptionHebrew: 'עדכון תלמיד' },
      { resource: 'students', action: 'delete', method: 'DELETE', path: '/api/students/:id', description: 'Delete student', descriptionHebrew: 'מחיקת תלמיד' },
    ],
    adminOnly: true, // Only admins can edit students
  },

  // Cohorts Management
  'cohorts': {
    page: 'cohorts',
    displayName: 'Cohorts',
    displayNameHebrew: 'מחזורים',
    description: 'Manage student cohorts',
    descriptionHebrew: 'ניהול מחזורי תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מחזורי תלמידים במערכת. עם הרשאת צפייה ניתן לראות רשימת מחזורים ופרטי מחזור ספציפי. עם הרשאת עריכה ניתן להוסיף מחזורים חדשים, לעדכן פרטי מחזורים קיימים, ולמחוק מחזורים. רק אדמינים יכולים לערוך מחזורים.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts', description: 'List all cohorts', descriptionHebrew: 'רשימת כל המחזורים' },
      { resource: 'cohorts', action: 'read', method: 'GET', path: '/api/cohorts/:id', description: 'Get cohort by ID', descriptionHebrew: 'קבלת מחזור לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'cohorts', action: 'create', method: 'POST', path: '/api/cohorts', description: 'Create new cohort', descriptionHebrew: 'יצירת מחזור חדש' },
      { resource: 'cohorts', action: 'update', method: 'PUT', path: '/api/cohorts/:id', description: 'Update cohort', descriptionHebrew: 'עדכון מחזור' },
    ],
    adminOnly: true,
  },

  // Classes Management
  'classes': {
    page: 'classes',
    displayName: 'Classes',
    displayNameHebrew: 'כיתות',
    description: 'Manage classes and enrollments',
    descriptionHebrew: 'ניהול כיתות והרשמות',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול כיתות והרשמות תלמידים לכיתות. עם הרשאת צפייה ניתן לראות רשימת כיתות ופרטי כיתה ספציפית. עם הרשאת עריכה ניתן להוסיף כיתות חדשות, לעדכן פרטי כיתות קיימות, ולמחוק כיתות. רק אדמינים יכולים לערוך כיתות.',
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
    adminOnly: true,
  },

  // Student Exits
  'student-exits': {
    page: 'student-exits',
    displayName: 'Student Exits',
    displayNameHebrew: 'עזיבת תלמידים',
    description: 'Manage student exit records',
    descriptionHebrew: 'ניהול רשומות עזיבת תלמידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול רשומות עזיבת תלמידים מהמערכת. עם הרשאת צפייה ניתן לראות רשימת עזיבות תלמידים ופרטי עזיבה ספציפית. עם הרשאת עריכה ניתן ליצור רשומות עזיבה חדשות, לעדכן פרטי עזיבות קיימות, ולמחוק רשומות עזיבה. רק אדמינים יכולים לערוך עזיבות תלמידים.',
    category: 'academic',
    categoryHebrew: 'אקדמי',
    viewAPIs: [
      { resource: 'student-exits', action: 'read', method: 'GET', path: '/api/student-exits', description: 'List all student exits', descriptionHebrew: 'רשימת כל עזיבות התלמידים' },
      { resource: 'student-exits', action: 'read', method: 'GET', path: '/api/student-exits/:id', description: 'Get student exit by ID', descriptionHebrew: 'קבלת עזיבת תלמיד לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'student-exits', action: 'create', method: 'POST', path: '/api/student-exits', description: 'Create student exit record', descriptionHebrew: 'יצירת רשומת עזיבת תלמיד' },
      { resource: 'student-exits', action: 'update', method: 'PUT', path: '/api/student-exits/:id', description: 'Update student exit', descriptionHebrew: 'עדכון עזיבת תלמיד' },
      { resource: 'student-exits', action: 'delete', method: 'DELETE', path: '/api/student-exits/:id', description: 'Delete student exit', descriptionHebrew: 'מחיקת עזיבת תלמיד' },
    ],
    adminOnly: true,
  },

  // Users Management
  'users': {
    page: 'users',
    displayName: 'Users',
    displayNameHebrew: 'משתמשים',
    description: 'Manage system users',
    descriptionHebrew: 'ניהול משתמשי המערכת',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של משתמשי המערכת. עם הרשאת צפייה ניתן לראות רשימת משתמשים, פרטי משתמש ספציפי, ומחלקות ותפקידים. עם הרשאת עריכה ניתן להוסיף משתמשים חדשים, לעדכן פרטי משתמשים קיימים, ולמחוק משתמשים. רק אדמינים יכולים לערוך משתמשים.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'soldiers', action: 'read', method: 'GET', path: '/api/soldiers', description: 'List all users', descriptionHebrew: 'רשימת כל המשתמשים' },
      { resource: 'soldiers', action: 'read', method: 'GET', path: '/api/soldiers/:id', description: 'Get user by ID', descriptionHebrew: 'קבלת משתמש לפי מזהה' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments', description: 'List departments (for user context)', descriptionHebrew: 'רשימת מחלקות (הקשר משתמשים)' },
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles', description: 'List roles (for user context)', descriptionHebrew: 'רשימת תפקידים (הקשר משתמשים)' },
    ],
    editAPIs: [
      { resource: 'soldiers', action: 'create', method: 'POST', path: '/api/soldiers', description: 'Create new user', descriptionHebrew: 'יצירת משתמש חדש' },
      { resource: 'soldiers', action: 'update', method: 'PUT', path: '/api/soldiers/:id', description: 'Update user', descriptionHebrew: 'עדכון משתמש' },
      { resource: 'soldiers', action: 'delete', method: 'DELETE', path: '/api/soldiers/:id', description: 'Delete user', descriptionHebrew: 'מחיקת משתמש' },
    ],
    adminOnly: true,
  },

  // Departments Management
  'departments': {
    page: 'departments',
    displayName: 'Departments',
    displayNameHebrew: 'מחלקות',
    description: 'Manage departments',
    descriptionHebrew: 'ניהול מחלקות',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של מחלקות במערכת. עם הרשאת צפייה ניתן לראות רשימת מחלקות, פרטי מחלקה ספציפית, ומפקדי מחלקות. עם הרשאת עריכה ניתן להוסיף מחלקות חדשות, לעדכן פרטי מחלקות קיימות, ולמחוק מחלקות. רק אדמינים יכולים לערוך מחלקות.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments', description: 'List all departments', descriptionHebrew: 'רשימת כל המחלקות' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments/:id', description: 'Get department by ID', descriptionHebrew: 'קבלת מחלקה לפי מזהה' },
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments/:id/commanders', description: 'Get department commanders', descriptionHebrew: 'קבלת מפקדי מחלקה' },
    ],
    editAPIs: [
      { resource: 'departments', action: 'create', method: 'POST', path: '/api/departments', description: 'Create new department', descriptionHebrew: 'יצירת מחלקה חדשה' },
      { resource: 'departments', action: 'update', method: 'PUT', path: '/api/departments/:id', description: 'Update department', descriptionHebrew: 'עדכון מחלקה' },
      { resource: 'departments', action: 'delete', method: 'DELETE', path: '/api/departments/:id', description: 'Delete department', descriptionHebrew: 'מחיקת מחלקה' },
    ],
    adminOnly: true,
  },

  // Roles Management
  'roles': {
    page: 'roles',
    displayName: 'Roles',
    displayNameHebrew: 'תפקידים',
    description: 'Manage user roles',
    descriptionHebrew: 'ניהול תפקידי משתמשים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של תפקידי משתמשים במערכת. עם הרשאת צפייה ניתן לראות רשימת תפקידים ופרטי תפקיד ספציפי. עם הרשאת עריכה ניתן להוסיף תפקידים חדשים, לעדכן פרטי תפקידים קיימים, ולמחוק תפקידים. רק אדמינים יכולים לערוך תפקידים.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles', description: 'List all roles', descriptionHebrew: 'רשימת כל התפקידים' },
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles/:id', description: 'Get role by ID', descriptionHebrew: 'קבלת תפקיד לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'roles', action: 'create', method: 'POST', path: '/api/roles', description: 'Create new role', descriptionHebrew: 'יצירת תפקיד חדש' },
      { resource: 'roles', action: 'update', method: 'PUT', path: '/api/roles/:id', description: 'Update role', descriptionHebrew: 'עדכון תפקיד' },
      { resource: 'roles', action: 'delete', method: 'DELETE', path: '/api/roles/:id', description: 'Delete role', descriptionHebrew: 'מחיקת תפקיד' },
    ],
    adminOnly: true,
  },

  // Rooms Management
  'rooms': {
    page: 'rooms',
    displayName: 'Rooms',
    displayNameHebrew: 'חדרים',
    description: 'Manage rooms',
    descriptionHebrew: 'ניהול חדרים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של חדרים במערכת. עם הרשאת צפייה ניתן לראות רשימת חדרים ופרטי חדר ספציפי. עם הרשאת עריכה ניתן להוסיף חדרים חדשים, לעדכן פרטי חדרים קיימים, ולמחוק חדרים. רק אדמינים יכולים לערוך חדרים.',
    category: 'resources',
    categoryHebrew: 'משאבים',
    viewAPIs: [
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms', description: 'List all rooms', descriptionHebrew: 'רשימת כל החדרים' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms/:id', description: 'Get room by ID', descriptionHebrew: 'קבלת חדר לפי מזהה' },
    ],
    editAPIs: [
      { resource: 'rooms', action: 'create', method: 'POST', path: '/api/rooms', description: 'Create new room', descriptionHebrew: 'יצירת חדר חדש' },
      { resource: 'rooms', action: 'update', method: 'PUT', path: '/api/rooms/:id', description: 'Update room', descriptionHebrew: 'עדכון חדר' },
      { resource: 'rooms', action: 'delete', method: 'DELETE', path: '/api/rooms/:id', description: 'Delete room', descriptionHebrew: 'מחיקת חדר' },
    ],
    adminOnly: true,
  },

  // Permissions Management
  'permissions': {
    page: 'permissions',
    displayName: 'Permissions',
    displayNameHebrew: 'הרשאות',
    description: 'Manage user and role permissions',
    descriptionHebrew: 'ניהול הרשאות משתמשים ותפקידים',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של הרשאות במערכת. עם הרשאת צפייה ניתן לראות רשימת הרשאות, הרשאות של משתמש ספציפי, ומשתמשים עם הרשאה מסוימת. עם הרשאת עריכה ניתן ליצור הרשאות חדשות, להעניק הרשאות למשתמשים, ולשלול הרשאות ממשתמשים. רק אדמינים יכולים לערוך הרשאות.',
    category: 'administration',
    categoryHebrew: 'ניהול',
    viewAPIs: [
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions', description: 'List all permissions', descriptionHebrew: 'רשימת כל ההרשאות' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/:id', description: 'Get permission by ID', descriptionHebrew: 'קבלת הרשאה לפי מזהה' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/my-permissions', description: 'Get my permissions', descriptionHebrew: 'קבלת ההרשאות שלי' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/users/:userId', description: 'Get user permissions', descriptionHebrew: 'קבלת הרשאות משתמש' },
      { resource: 'permissions', action: 'read', method: 'GET', path: '/api/permissions/:permissionId/users', description: 'Get users with permission', descriptionHebrew: 'קבלת משתמשים עם הרשאה' },
    ],
    editAPIs: [
      { resource: 'permissions', action: 'create', method: 'POST', path: '/api/permissions', description: 'Create new permission', descriptionHebrew: 'יצירת הרשאה חדשה' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/grant', description: 'Grant permission to user', descriptionHebrew: 'הענקת הרשאה למשתמש' },
      { resource: 'permissions', action: 'update', method: 'POST', path: '/api/permissions/users/:userId/revoke', description: 'Revoke permission from user', descriptionHebrew: 'שלילת הרשאה ממשתמש' },
    ],
    adminOnly: true,
  },

  // SOC (Security Operations Center)
  'soc': {
    page: 'soc',
    displayName: 'Security Operations',
    displayNameHebrew: 'מרכז פעילות אבטחה',
    description: 'View security logs and incidents',
    descriptionHebrew: 'צפייה בלוגי אבטחה ואירועים',
    detailedExplanation: 'הרשאה זו מאפשרת גישה למרכז פעילות אבטחה (SOC) של המערכת. עם הרשאת צפייה ניתן לראות לוגי ביקורת, סטטיסטיקות אבטחה, ואירועי אבטחה. עם הרשאת עריכה ניתן לעדכן סטטוס אירוע, להקצות אירוע למנתח, ולפתור אירועים. רק אדמינים יכולים לערוך אירועי אבטחה.',
    category: 'security',
    categoryHebrew: 'אבטחה',
    viewAPIs: [
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/audit-logs', description: 'View audit logs', descriptionHebrew: 'צפייה בלוגי ביקורת' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/stats', description: 'View security statistics', descriptionHebrew: 'צפייה בסטטיסטיקות אבטחה' },
      { resource: 'soc', action: 'read', method: 'GET', path: '/api/soc/incidents', description: 'View security incidents', descriptionHebrew: 'צפייה באירועי אבטחה' },
    ],
    editAPIs: [
      { resource: 'soc', action: 'update', method: 'PUT', path: '/api/soc/incidents/:id', description: 'Update incident status', descriptionHebrew: 'עדכון סטטוס אירוע' },
      { resource: 'soc', action: 'update', method: 'PUT', path: '/api/soc/incidents/:id/assign', description: 'Assign incident', descriptionHebrew: 'הקצאת אירוע' },
      { resource: 'soc', action: 'update', method: 'PUT', path: '/api/soc/incidents/:id/resolve', description: 'Resolve incident', descriptionHebrew: 'פתרון אירוע' },
    ],
    adminOnly: true,
  },

  // API Keys Management
  'api-keys': {
    page: 'api-keys',
    displayName: 'API Keys',
    displayNameHebrew: 'מפתחות API',
    description: 'Manage API keys',
    descriptionHebrew: 'ניהול מפתחות API',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של מפתחות API במערכת. עם הרשאת צפייה ניתן לראות רשימת מפתחות API ופרטי מפתח ספציפי. עם הרשאת עריכה ניתן ליצור מפתחות API חדשים, לעדכן פרטי מפתחות קיימים, ולבטל מפתחות API. רק אדמינים יכולים לערוך מפתחות API.',
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
    adminOnly: true,
  },

  // Resources (General)
  'resources': {
    page: 'resources',
    displayName: 'Resources',
    displayNameHebrew: 'משאבים',
    description: 'View system resources',
    descriptionHebrew: 'צפייה במשאבי המערכת',
    detailedExplanation: 'הרשאה זו מאפשרת למשתמש לצפות במשאבי המערכת הבסיסיים כמו מחלקות, תפקידים, וחדרים. זו הרשאה לצפייה בלבד - לא ניתן לערוך משאבים דרך הרשאה זו.',
    category: 'general',
    categoryHebrew: 'כללי',
    viewAPIs: [
      { resource: 'departments', action: 'read', method: 'GET', path: '/api/departments', description: 'List departments', descriptionHebrew: 'רשימת מחלקות' },
      { resource: 'roles', action: 'read', method: 'GET', path: '/api/roles', description: 'List roles', descriptionHebrew: 'רשימת תפקידים' },
      { resource: 'rooms', action: 'read', method: 'GET', path: '/api/rooms', description: 'List rooms', descriptionHebrew: 'רשימת חדרים' },
    ],
    editAPIs: [],
  },

  // Search
  'search': {
    page: 'search',
    displayName: 'Search',
    displayNameHebrew: 'חיפוש',
    description: 'Search across the system',
    descriptionHebrew: 'חיפוש במערכת',
    detailedExplanation: 'הרשאה זו מאפשרת למשתמש לבצע חיפוש בכל המשאבים במערכת. עם הרשאה זו ניתן לחפש תלמידים, משתמשים, מחלקות, תפקידים, וכל משאב אחר במערכת.',
    category: 'general',
    categoryHebrew: 'כללי',
    viewAPIs: [
      { resource: 'search', action: 'read', method: 'GET', path: '/api/search', description: 'Search across resources', descriptionHebrew: 'חיפוש בכל המשאבים' },
    ],
    editAPIs: [],
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

/**
 * Check if a page requires admin for editing
 */
export function isPageAdminOnly(page: string): boolean {
  return PAGE_PERMISSIONS[page]?.adminOnly ?? false;
}
