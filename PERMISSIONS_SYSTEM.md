# מערכת הרשאות דינמית - מדריך שימוש

## סקירה כללית

המערכת תומכת בהרשאות דינמיות ומתקדמות, בדומה לאתרים גדולים. המערכת מאפשרת:

1. **Scoped Permissions** - הרשאות מוגבלות למשאבים ספציפיים
2. **Permission Policies** - כללים דינמיים (למשל: מפקד רואה רק את החיילים במחלקה שלו)
3. **Dynamic UI** - TABs ורכיבים שמופיעים לפי הרשאות
4. **Context-aware permissions** - בדיקות הרשאות תלויות הקשר

## מבנה הרשאות

### פורמט בסיסי
```
resource:action
```
דוגמה: `soldiers.read`, `students.write`

### Scoped Permissions
```
resource:action:scopeType:scopeValue
```
דוגמאות:
- `soldiers.read:department:123` - קריאה לחיילים במחלקה 123
- `students.read:all` - קריאה לכל התלמידים
- `users.manage:role:5` - ניהול משתמשים עם תפקיד 5

### Scope Types
- `department` - מוגבל למחלקה ספציפית
- `role` - מוגבל לתפקיד ספציפי
- `user` - מוגבל למשתמש ספציפי
- `all` - גישה לכל המשאבים

## שימוש ב-Frontend

### 1. PermissionGuard - הגנה על רכיבים

```tsx
import { PermissionGuard } from '../components/PermissionGuard';

// הרשאה בסיסית
<PermissionGuard permission="soldiers.read">
  <SoldiersList />
</PermissionGuard>

// עם resource/action
<PermissionGuard resource="students" action="write">
  <CreateStudentForm />
</PermissionGuard>

// עם scope
<PermissionGuard 
  permission="soldiers.read:department"
  resourceData={{ departmentId: 123 }}
>
  <DepartmentSoldiers />
</PermissionGuard>
```

### 2. useHasPermission Hook

```tsx
import { useHasPermission } from '../hooks/usePermission';

function MyComponent() {
  const hasPermission = useHasPermission();
  
  // בדיקת הרשאה בסיסית
  const canRead = hasPermission('soldiers.read');
  
  // בדיקת הרשאה עם scope
  const canReadDept = hasPermission('soldiers.read:department:123');
  
  // עם אובייקט
  const canWrite = hasPermission({
    resource: 'students',
    action: 'write',
    scope: { type: 'department', value: 123 }
  });
  
  return canRead ? <SoldiersList /> : null;
}
```

### 3. useCanAccessResource - בדיקת גישה למשאב ספציפי

```tsx
import { useCanAccessResource } from '../hooks/usePermission';

function SoldierCard({ soldier }) {
  const canAccess = useCanAccessResource();
  
  const canEdit = canAccess('soldiers', 'write', {
    departmentId: soldier.departmentId,
    userId: soldier.id
  });
  
  return (
    <div>
      <h3>{soldier.name}</h3>
      {canEdit && <EditButton />}
    </div>
  );
}
```

### 4. useFilteredResources - סינון משאבים לפי הרשאות

```tsx
import { useFilteredResources } from '../hooks/usePermission';

function SoldiersList({ allSoldiers }) {
  const filterResources = useFilteredResources();
  
  // רק חיילים שהמשתמש יכול לראות
  const visibleSoldiers = filterResources(
    allSoldiers,
    'soldiers',
    'read'
  );
  
  return (
    <ul>
      {visibleSoldiers.map(soldier => (
        <li key={soldier.id}>{soldier.name}</li>
      ))}
    </ul>
  );
}
```

### 5. Dynamic Navigation - ניווט דינמי

```tsx
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';

const navigationItems = [
  { name: 'לוח בקרה', href: '/dashboard', icon: Dashboard },
  {
    name: 'חיילים',
    href: '/soldiers',
    icon: Users,
    permission: 'soldiers.read:department', // רק במחלקה של המשתמש
  },
  {
    name: 'ניהול',
    href: '/admin',
    icon: Settings,
    permission: 'admin.access',
    children: [
      {
        name: 'משתמשים',
        href: '/admin/users',
        permission: 'users.manage',
      },
    ],
  },
];

function MyNavigation() {
  const navigation = useDynamicNavigation(navigationItems);
  // navigation מכיל רק את הפריטים שהמשתמש יכול לראות
  return navigation.map(item => <NavItem key={item.href} {...item} />);
}
```

## שימוש ב-Backend

### 1. Permission Middleware

```typescript
import { requirePermission } from '../lib/permissions';

// הרשאה בסיסית
router.get('/soldiers', 
  authenticate, 
  requirePermission('soldiers.read'),
  soldiersController.getAll
);

// עם policies
router.get('/soldiers',
  authenticate,
  requirePermission('soldiers.read', ['commanderDepartmentScope']),
  soldiersController.getAll
);
```

### 2. Permission Policies

```typescript
import { permissionPolicies } from '../lib/permissions';

// Policy מובנה: מפקד רואה רק את המחלקה שלו
router.get('/soldiers',
  authenticate,
  requirePermission('soldiers.read', ['commanderDepartmentScope']),
  async (req, res) => {
    // רק חיילים במחלקה של המפקד יוחזרו
    const soldiers = await getSoldiers();
    res.json(soldiers);
  }
);
```

### 3. Filter Resources by Permission

```typescript
import { filterResourcesByPermission } from '../lib/permissions';

async function getSoldiersForUser(userId: number) {
  const allSoldiers = await prisma.soldier.findMany();
  
  // סינון אוטומטי לפי הרשאות ו-policies
  const filtered = await filterResourcesByPermission(
    userId,
    allSoldiers,
    'soldiers.read',
    ['commanderDepartmentScope']
  );
  
  return filtered;
}
```

## דוגמאות שימוש

### דוגמה 1: מפקד רואה רק את החיילים במחלקה שלו

**Backend:**
```typescript
router.get('/soldiers',
  authenticate,
  requirePermission('soldiers.read', ['commanderDepartmentScope']),
  async (req, res) => {
    const user = req.user;
    const soldiers = await getSoldiersForUser(user.userId);
    res.json(soldiers);
  }
);
```

**Frontend:**
```tsx
function SoldiersPage() {
  const filterResources = useFilteredResources();
  const [soldiers, setSoldiers] = useState([]);
  
  useEffect(() => {
    apiClient.get('/soldiers').then(res => {
      // סינון נוסף בצד הלקוח (אם צריך)
      const filtered = filterResources(res.data, 'soldiers', 'read');
      setSoldiers(filtered);
    });
  }, []);
  
  return <SoldiersList soldiers={soldiers} />;
}
```

### דוגמה 2: TABs דינמיים לפי הרשאות

```tsx
function StudentsPage() {
  const hasPermission = useHasPermission();
  
  const tabs = [
    { id: 'all', label: 'כל התלמידים', permission: 'students.read:all' },
    { id: 'my-class', label: 'הכיתה שלי', permission: 'students.read:class' },
    { id: 'my-department', label: 'המחלקה שלי', permission: 'students.read:department' },
  ].filter(tab => hasPermission(tab.permission));
  
  return (
    <Tabs>
      {tabs.map(tab => (
        <Tab key={tab.id} value={tab.id}>
          {tab.label}
        </Tab>
      ))}
    </Tabs>
  );
}
```

### דוגמה 3: Navigation עם הרשאות מותאמות אישית

```tsx
const navigationItems = [
  { name: 'לוח בקרה', href: '/dashboard' },
  {
    name: 'חיילים',
    href: '/soldiers',
    permission: {
      resource: 'soldiers',
      action: 'read',
      scope: { type: 'department' } // משתמש במחלקה של המשתמש
    },
  },
  {
    name: 'ניהול',
    href: '/admin',
    permission: 'admin.access',
    visible: false, // יוצג רק אם יש הרשאה
  },
];
```

## יצירת Permission Policies מותאמים

```typescript
// backend/src/lib/permissions.ts

export const permissionPolicies: Record<string, PermissionPolicy> = {
  // Policy מותאם אישית
  myCustomPolicy: {
    name: 'myCustomPolicy',
    description: 'Policy מותאם אישית',
    check: async (context: PermissionContext, resource?: any) => {
      // הלוגיקה שלך כאן
      if (context.isCommander && resource) {
        return resource.departmentId === context.departmentId;
      }
      return true;
    },
  },
};
```

## טיפים

1. **תמיד בדוק הרשאות גם ב-backend וגם ב-frontend** - Frontend רק ל-UX, Backend לאבטחה
2. **השתמש ב-policies לכללים מורכבים** - לא צריך ליצור הרשאה חדשה לכל כלל
3. **Scoped permissions עבור גישה מוגבלת** - למשל מפקד במחלקה
4. **Dynamic navigation ל-UX טוב יותר** - משתמשים רואים רק מה שהם יכולים להשתמש בו

## הערות

- Admins תמיד יש להם את כל ההרשאות
- Scoped permissions משתמשים בהקשר של המשתמש (departmentId, roleId, וכו')
- Policies מופעלות אחרי בדיקת ההרשאה הבסיסית
- המערכת תומכת בהרחבות עתידיות בקלות
