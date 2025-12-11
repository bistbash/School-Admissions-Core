# מדריך מקיף: הרשאות ואבטחה

מדריך מפורט על איך מערכת ההרשאות והאבטחה עובדת במערכת, ואיך לבנות הרשאות חדשות.

---

## תוכן עניינים

1. [איך הרשאות עובדות](#איך-הרשאות-עובדות)
2. [איך מאבטחים את האתר](#איך-מאבטחים-את-האתר)
3. [איך בונים הרשאות חדשות](#איך-בונים-הרשאות-חדשות)
4. [דוגמאות מעשיות](#דוגמאות-מעשיות)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## איך הרשאות עובדות

### מבנה המערכת

המערכת מבוססת על **שני סוגי הרשאות**:

#### 1. Page Permissions (הרשאות דפים)
- **Format**: `page:pageName:action`
- **Actions**: `view` או `edit`
- **דוגמאות**:
  - `page:students:view` - צפייה בדף תלמידים
  - `page:students:edit` - עריכה בדף תלמידים

#### 2. API Permissions (הרשאות API)
- **Format**: `resource:action`
- **Actions**: `read`, `create`, `update`, `delete`
- **דוגמאות**:
  - `students:read` - קריאת תלמידים
  - `students:create` - יצירת תלמידים
  - `students:update` - עדכון תלמידים
  - `students:delete` - מחיקת תלמידים

### זרימת הרשאות

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authentication  │  ← JWT Token או API Key
│   Middleware    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Permission      │  ← בודק הרשאות
│   Middleware    │
└────────┬────────┘
         │
         ├─► Admin? → ✅ Full Access
         │
         ├─► Page Permission? → ✅ Check API Permissions
         │
         ├─► Direct API Permission? → ✅ Allow
         │
         └─► No Permission → ❌ 403 Forbidden
```

### Permission Registry

כל הדפים וה-APIs מוגדרים ב-`permission-registry.ts`:

```typescript
{
  'students': {
    page: 'students',
    viewAPIs: [
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students' },
      { resource: 'tracks', action: 'read', method: 'GET', path: '/api/tracks' },
      // ...
    ],
    editAPIs: [
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students' },
      { resource: 'students', action: 'update', method: 'PUT', path: '/api/students/:id' },
      // ...
    ],
  }
}
```

### איך זה עובד בפועל

#### שלב 1: Authentication
```typescript
// backend/src/lib/auth/auth.ts
export async function authenticate(req, res, next) {
  // 1. בדוק JWT Token או API Key
  const token = req.headers.authorization?.replace('Bearer ', '');
  const apiKey = req.headers['x-api-key'];
  
  // 2. אימות
  if (apiKey) {
    const isValid = await verifyAPIKey(apiKey);
    if (isValid) {
      (req as any).user = { userId: keyInfo.userId };
      return next();
    }
  }
  
  if (token) {
    const payload = verifyToken(token);
    (req as any).user = payload;
    return next();
  }
  
  throw new UnauthorizedError('Authentication required');
}
```

#### שלב 2: Permission Check
```typescript
// backend/src/lib/permissions/api-permission-middleware.ts
export function requireAPIPermission(req, res, next) {
  const userId = req.user?.userId;
  
  // 1. בדוק אם Admin
  if (await isUserAdmin(userId)) {
    return next(); // ✅ Full access
  }
  
  // 2. בדוק Page Permissions
  for (const [pageKey, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
    for (const apiPerm of [...pagePermission.viewAPIs, ...pagePermission.editAPIs]) {
      if (matchesAPIPermission(apiPerm, req.method, req.path)) {
        const permissionName = `page:${pageKey}:${apiPerm in pagePermission.viewAPIs ? 'view' : 'edit'}`;
        if (await hasScopedPermission(userId, permissionName)) {
          return next(); // ✅ Has permission
        }
      }
    }
  }
  
  // 3. בדוק Direct API Permissions
  const resource = extractResourceFromPath(req.path);
  const action = extractActionFromMethod(req.method);
  if (await hasScopedPermission(userId, `${resource}:${action}`)) {
    return next(); // ✅ Has permission
  }
  
  // ❌ No permission
  throw new ForbiddenError('Permission required');
}
```

### איך הרשאות נשמרות ב-Database

```sql
-- Permission table
Permission {
  id: 1,
  name: "page:students:view",
  resource: "page",
  action: "students:view"
}

-- User Permission (הרשאה ישירה למשתמש)
UserPermission {
  userId: 5,
  permissionId: 1,
  isActive: true
}

-- Role Permission (הרשאה דרך תפקיד)
RolePermission {
  roleId: 3,
  permissionId: 1,
  isActive: true
}
```

### איך הרשאות ניתנות

#### דרך 1: ישירות למשתמש
```typescript
// POST /api/permissions/users/:userId/grant-page
{
  "page": "students",
  "action": "view"
}
```

#### דרך 2: דרך תפקיד
```typescript
// POST /api/permissions/roles/:roleId/grant-page
{
  "page": "students",
  "action": "view"
}
```

#### דרך 3: תבנית הרשאות (Preset)
```typescript
// POST /api/permissions/users/:userId/apply-preset
{
  "presetId": "teacher"
}
```

### הרשאות אוטומטיות

כשנותנים הרשאת דף, המערכת נותנת **אוטומטית** את כל ה-API permissions הקשורים:

```typescript
// כשנותנים: page:students:view
// המערכת נותנת אוטומטית:
// - students:read
// - tracks:read
// - cohorts:read
// - classes:read
// (כל ה-APIs ב-viewAPIs)

// כשנותנים: page:students:edit
// המערכת נותנת אוטומטית:
// - כל ה-viewAPIs
// - students:create
// - students:update
// - students:delete
// - tracks:create
// - tracks:update
// - tracks:delete
// (כל ה-APIs ב-viewAPIs + editAPIs)
```

---

## איך מאבטחים את האתר

המערכת משתמשת ב-**שכבות אבטחה מרובות**:

### שכבה 1: Network Security

#### Helmet.js - Security Headers
```typescript
// backend/src/server.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      // ...
    },
  },
}));
```

**מה זה עושה:**
- מונע XSS attacks
- מונע clickjacking
- מגדיר security headers

#### CORS Protection
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));
```

**מה זה עושה:**
- מאפשר רק requests מ-frontend המורשה
- מונע CSRF attacks

### שכבה 2: Authentication

#### JWT Tokens
```typescript
// יצירת Token
const token = jwt.sign(
  { userId: user.id, email: user.email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// אימות Token
const payload = jwt.verify(token, JWT_SECRET);
```

**מה זה עושה:**
- אימות משתמשים
- Session management
- Token expiration

#### API Keys
```typescript
// יצירת API Key
const apiKey = `sk_${generateSecureRandomString()}`;
const hashedKey = await bcrypt.hash(apiKey, 12);

// אימות API Key
const isValid = await bcrypt.compare(apiKey, hashedKey);
```

**מה זה עושה:**
- אימות תוכניות חיצוניות
- Tracking של API usage
- אפשרות לחסום API keys

### שכבה 3: Authorization (הרשאות)

#### Permission Middleware
```typescript
// כל API endpoint מוגן
app.use('/api', requireAPIPermission);
```

**מה זה עושה:**
- בודק הרשאות לפני כל request
- Admin users מקבלים full access
- Regular users נבדקים לפי permissions

#### Admin Protection
```typescript
// Admin-only endpoints
router.post('/create-user', requireAdmin, controller.createUser);
```

**מה זה עושה:**
- רק admins יכולים לגשת
- בדיקה נוספת מעבר ל-permissions

### שכבה 4: Rate Limiting

#### API Rate Limiting
```typescript
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per 15 minutes
  skip: async (req) => {
    return await isRequestFromTrustedUser(req);
  },
});
```

**מה זה עושה:**
- מונע DDoS attacks
- מונע brute force attacks
- מגביל requests per IP

#### Login Rate Limiting
```typescript
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 failed attempts per 15 minutes
  skipSuccessfulRequests: true, // רק failed attempts נספרים
});
```

**מה זה עושה:**
- מונע brute force על login
- מגביל ניסיונות התחברות

### שכבה 5: Input Validation

#### Zod Validation
```typescript
const createStudentSchema = z.object({
  idNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE']),
});

// In controller
const validated = createStudentSchema.parse(req.body);
```

**מה זה עושה:**
- מונע SQL injection
- מונע XSS attacks
- מבטיח data integrity

### שכבה 6: IP Blocking

#### IP Blocking Middleware
```typescript
// backend/src/lib/security/ipBlocking.ts
export async function ipBlockingMiddleware(req, res, next) {
  const ip = req.ip;
  const isBlocked = await prisma.blockedIP.findFirst({
    where: {
      ipAddress: ip,
      isActive: true,
    },
  });
  
  if (isBlocked) {
    return res.status(403).json({ error: 'IP blocked' });
  }
  
  next();
}
```

**מה זה עושה:**
- חוסם IPs חשודים
- מונע access מ-IPs מוגדרים
- SOC יכול לחסום IPs אוטומטית

### שכבה 7: Audit Logging

#### כל פעולה נרשמת
```typescript
// backend/src/lib/audit/audit.ts
await auditFromRequest(req, 'CREATE', 'STUDENT', {
  status: 'SUCCESS',
  resourceId: result.id,
  details: { /* ... */ },
});
```

**מה זה עושה:**
- רישום כל הפעולות
- מעקב אחר IP, User-Agent
- SOC monitoring
- Anomaly detection

### שכבה 8: CSRF Protection

#### CSRF Middleware
```typescript
// backend/src/lib/security/csrf.ts
app.use('/api', csrfProtection);
```

**מה זה עושה:**
- מונע CSRF attacks
- בודק CSRF tokens

---

## איך בונים הרשאות חדשות

### שלב 1: הגדרת הדף ב-Permission Registry

ערוך את `backend/src/lib/permissions/permission-registry.ts`:

```typescript
export const PAGE_PERMISSIONS: Record<string, PagePermission> = {
  // ... existing pages
  
  // הדף החדש שלך
  'my-new-page': {
    page: 'my-new-page',
    displayName: 'My New Page',
    displayNameHebrew: 'הדף החדש שלי',
    description: 'Manage my new feature',
    descriptionHebrew: 'ניהול התכונה החדשה שלי',
    detailedExplanation: 'הרשאה זו מאפשרת ניהול מלא של התכונה החדשה...',
    category: 'general', // או 'academic', 'administration', 'security'
    categoryHebrew: 'כללי',
    
    // APIs לצפייה
    viewAPIs: [
      {
        resource: 'my-resource',
        action: 'read',
        method: 'GET',
        path: '/api/my-resource',
        description: 'List all items',
        descriptionHebrew: 'רשימת כל הפריטים',
      },
      {
        resource: 'my-resource',
        action: 'read',
        method: 'GET',
        path: '/api/my-resource/:id',
        description: 'Get item by ID',
        descriptionHebrew: 'קבלת פריט לפי מזהה',
      },
    ],
    
    // APIs לעריכה
    editAPIs: [
      {
        resource: 'my-resource',
        action: 'create',
        method: 'POST',
        path: '/api/my-resource',
        description: 'Create new item',
        descriptionHebrew: 'יצירת פריט חדש',
      },
      {
        resource: 'my-resource',
        action: 'update',
        method: 'PUT',
        path: '/api/my-resource/:id',
        description: 'Update item',
        descriptionHebrew: 'עדכון פריט',
      },
      {
        resource: 'my-resource',
        action: 'delete',
        method: 'DELETE',
        path: '/api/my-resource/:id',
        description: 'Delete item',
        descriptionHebrew: 'מחיקת פריט',
      },
    ],
    
    supportsEditMode: true, // או false אם view-only
  },
};
```

### שלב 2: יצירת Permissions ב-Database

הרץ את seed script:

```bash
cd backend
npm run seed-permissions
```

זה יוצר אוטומטית:
- `page:my-new-page:view`
- `page:my-new-page:edit`
- `my-resource:read`
- `my-resource:create`
- `my-resource:update`
- `my-resource:delete`

### שלב 3: הגנה על API Routes

עדכן את ה-routes שלך:

```typescript
// backend/src/modules/my-resource/my-resource.routes.ts
import { Router } from 'express';
import { requireResourcePagePermission } from '../../lib/permissions/page-permission-middleware';

const router = Router();

// View permissions
router.get(
  '/',
  requireResourcePagePermission('my-resource', 'read'),
  controller.getAll
);

router.get(
  '/:id',
  requireResourcePagePermission('my-resource', 'read'),
  controller.getById
);

// Edit permissions
router.post(
  '/',
  requireResourcePagePermission('my-resource', 'create'),
  controller.create
);

router.put(
  '/:id',
  requireResourcePagePermission('my-resource', 'update'),
  controller.update
);

router.delete(
  '/:id',
  requireResourcePagePermission('my-resource', 'delete'),
  controller.delete
);
```

### שלב 4: הגנה על Frontend Routes

עדכן את ה-routes ב-Frontend:

```tsx
// frontend/src/App.tsx
import { PermissionGuard } from './features/permissions/PermissionGuard';

<Route 
  path="my-new-page" 
  element={
    <PermissionGuard 
      page="my-new-page" 
      pageAction="view" 
      fallback={<Error403Page />}
    >
      <MyNewPage />
    </PermissionGuard>
  } 
/>
```

### שלב 5: בדיקת Permissions ב-Components

```tsx
// frontend/src/features/my-new-page/MyNewPage.tsx
import { usePermissions } from '@/features/permissions/PermissionsContext';

function MyNewPage() {
  const { hasPagePermission, hasResourcePermission } = usePermissions();
  
  const canView = hasPagePermission('my-new-page', 'view');
  const canEdit = hasPagePermission('my-new-page', 'edit');
  const canCreate = hasResourcePermission('my-resource', 'create');
  
  return (
    <div>
      {canView && <div>View content</div>}
      {canEdit && <button>Edit</button>}
      {canCreate && <button>Create</button>}
    </div>
  );
}
```

### שלב 6: בדיקת Permissions ב-Services (Backend)

```typescript
// backend/src/modules/my-resource/my-resource.service.ts
import { hasScopedPermission } from '../../lib/permissions/permissions';

export class MyResourceService {
  async getAll(userId: number) {
    // בדוק הרשאה
    const hasPermission = await hasScopedPermission(userId, 'my-resource:read');
    if (!hasPermission) {
      throw new ForbiddenError('Permission required: my-resource:read');
    }
    
    // המשך עם הלוגיקה
    return await prisma.myResource.findMany();
  }
}
```

---

## דוגמאות מעשיות

### דוגמה 1: דף חדש עם View + Edit

```typescript
// permission-registry.ts
'equipment': {
  page: 'equipment',
  displayName: 'Equipment',
  displayNameHebrew: 'ציוד',
  category: 'administration',
  viewAPIs: [
    { resource: 'equipment', action: 'read', method: 'GET', path: '/api/equipment' },
  ],
  editAPIs: [
    { resource: 'equipment', action: 'create', method: 'POST', path: '/api/equipment' },
    { resource: 'equipment', action: 'update', method: 'PUT', path: '/api/equipment/:id' },
    { resource: 'equipment', action: 'delete', method: 'DELETE', path: '/api/equipment/:id' },
  ],
  supportsEditMode: true,
}
```

### דוגמה 2: דף View-Only

```typescript
'reports': {
  page: 'reports',
  displayName: 'Reports',
  displayNameHebrew: 'דוחות',
  category: 'general',
  viewAPIs: [
    { resource: 'reports', action: 'read', method: 'GET', path: '/api/reports' },
  ],
  editAPIs: [], // אין עריכה
  supportsEditMode: false, // View-only
}
```

### דוגמה 3: דף עם Custom Modes

```typescript
'students': {
  // ... existing config
  customModes: [
    {
      id: 'teacher',
      name: 'Teacher',
      nameHebrew: 'מורה',
      viewAPIs: [
        // מורה רואה רק את התלמידים שלה
        { resource: 'students', action: 'read', method: 'GET', path: '/api/students?teacherId=:userId' },
      ],
    },
    {
      id: 'counselor',
      name: 'Counselor',
      nameHebrew: 'יועצת',
      viewAPIs: [
        // יועצת רואה את כל התלמידים + מידע נוסף
        { resource: 'students', action: 'read', method: 'GET', path: '/api/students' },
        { resource: 'students', action: 'read', method: 'GET', path: '/api/students/counselor-data' },
      ],
    },
  ],
}
```

---

## Best Practices

### 1. תמיד הגדר Permissions לפני יצירת API

```typescript
// ✅ Good
// 1. הגדר ב-permission-registry
// 2. הרץ seed-permissions
// 3. צור API routes עם protection
// 4. בדוק שהכל עובד

// ❌ Bad
// יצירת API routes ללא permissions
```

### 2. השתמש ב-Page Permissions במקום Direct API Permissions

```typescript
// ✅ Good - Page permission
page:students:view → נותן אוטומטית students:read, tracks:read, etc.

// ❌ Bad - Direct API permissions
students:read, tracks:read, cohorts:read (צריך לתת כל אחד בנפרד)
```

### 3. בדוק Permissions גם ב-Frontend וגם ב-Backend

```typescript
// ✅ Good
// Frontend: PermissionGuard + usePermissions hook
// Backend: requireResourcePagePermission middleware

// ❌ Bad
// רק Frontend או רק Backend
```

### 4. תמיד Log פעולות חשובות

```typescript
// ✅ Good
await auditFromRequest(req, 'CREATE', 'STUDENT', {
  status: 'SUCCESS',
  resourceId: result.id,
});

// ❌ Bad
// No logging
```

### 5. השתמש ב-Validation

```typescript
// ✅ Good
const validated = createStudentSchema.parse(req.body);

// ❌ Bad
const data = req.body; // No validation
```

---

## Troubleshooting

### בעיה: משתמש לא יכול לגשת לדף

**פתרונות:**
1. בדוק שהמשתמש יש לו הרשאת `page:pageName:view`
2. בדוק שהמשתמש מאושר (`approvalStatus: 'APPROVED'`)
3. בדוק שהמשתמש לא מנהל (אם כן, הוא צריך לקבל הרשאות אוטומטית)
4. בדוק את ה-console logs ב-backend
5. בדוק את ה-network tab ב-frontend

### בעיה: משתמש לא יכול לבצע פעולה

**פתרונות:**
1. בדוק שהמשתמש יש לו הרשאת `page:pageName:edit`
2. בדוק שהמשתמש יש לו הרשאת API הנדרשת
3. בדוק שה-API endpoint מוגן ב-middleware
4. בדוק את ה-console logs ב-backend

### בעיה: הרשאות לא מתעדכנות

**פתרונות:**
1. רענן את הדף
2. בדוק שההרשאות נשמרו ב-database
3. בדוק שה-permissions נוצרו (הרץ `npm run seed-permissions`)
4. בדוק את ה-console logs ב-backend

### בעיה: API endpoint לא מוגן

**פתרונות:**
1. בדוק שה-route מוגן ב-`requireResourcePagePermission`
2. בדוק שה-API מוגדר ב-`permission-registry.ts`
3. בדוק שה-permission נוצר ב-database

---

## סיכום

מערכת ההרשאות והאבטחה במערכת מבוססת על:

1. **שכבות אבטחה מרובות** - Network, Authentication, Authorization, Rate Limiting, Validation, IP Blocking, Audit Logging, CSRF Protection
2. **Page-based Permissions** - הרשאות דפים עם auto-granting של API permissions
3. **Admin Override** - Admins מקבלים full access אוטומטית
4. **Audit Logging** - כל פעולה נרשמת ל-SOC
5. **Rate Limiting** - הגנה מפני DDoS ו-brute force

למידע נוסף:
- [Permissions System](./PERMISSIONS_SYSTEM.md) - מדריך מפורט על מערכת ההרשאות
- [Security Documentation](./security/) - תיעוד אבטחה מקיף
- [Backend Development Guide](./BACKEND_DEVELOPMENT.md) - מדריך פיתוח Backend
