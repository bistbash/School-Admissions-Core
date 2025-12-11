# מערכת ההרשאות - Permissions System

מדריך מקיף על איך מערכת ההרשאות עובדת באתר.

---

## תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [סוגי הרשאות](#סוגי-הרשאות)
3. [מבנה ההרשאות](#מבנה-ההרשאות)
4. [איך הרשאות ניתנות](#איך-הרשאות-ניתנות)
5. [הרשאות אוטומטיות](#הרשאות-אוטומטיות)
6. [הרשאות למשתמשים ולתפקידים](#הרשאות-למשתמשים-ולתפקידים)
7. [מצבי צפייה מותאמים אישית](#מצבי-צפייה-מותאמים-אישית)
8. [ניהול הרשאות](#ניהול-הרשאות)
9. [דוגמאות](#דוגמאות)

---

## סקירה כללית

מערכת ההרשאות במערכת מבוססת על שני סוגי הרשאות עיקריים:

1. **הרשאות דפים (Page Permissions)** - הרשאות לגשת לדפים ספציפיים באתר
2. **הרשאות API (API Permissions)** - הרשאות לגשת ל-endpoints ספציפיים ב-backend

המערכת עובדת בצורה היררכית: כשנותנים הרשאת דף, המערכת נותנת אוטומטית גם את כל ה-API permissions הקשורים לדף הזה.

---

## סוגי הרשאות

### 1. הרשאות דפים (Page Permissions)

כל דף במערכת יכול להיות עם שני סוגי הרשאות:

- **צפייה (View)** - הרשאה לראות את הדף
- **עריכה (Edit)** - הרשאה לערוך את הדף (כוללת גם צפייה)

**דוגמה:**
- דף "תלמידים" עם הרשאת צפייה - המשתמש יכול לראות את רשימת התלמידים
- דף "תלמידים" עם הרשאת עריכה - המשתמש יכול לראות, להוסיף, לערוך ולמחוק תלמידים

### 2. הרשאות API (API Permissions)

כל API endpoint במערכת דורש הרשאה ספציפית. ההרשאות מנוהלות בצורה של:
- `resource:action` - למשל: `students:read`, `students:create`, `students:update`, `students:delete`

**דוגמה:**
- `students:read` - הרשאה לקרוא תלמידים (GET)
- `students:create` - הרשאה ליצור תלמידים (POST)
- `students:update` - הרשאה לעדכן תלמידים (PUT)
- `students:delete` - הרשאה למחוק תלמידים (DELETE)

---

## מבנה ההרשאות

### Permission Registry

כל הדפים במערכת מוגדרים ב-`permission-registry.ts`. כל דף מכיל:

```typescript
{
  page: 'students',                    // מזהה הדף
  displayName: 'Students',             // שם באנגלית
  displayNameHebrew: 'תלמידים',        // שם בעברית
  description: 'Manage students',      // תיאור באנגלית
  descriptionHebrew: 'ניהול תלמידים',  // תיאור בעברית
  category: 'academic',                // קטגוריה
  categoryHebrew: 'אקדמי',             // קטגוריה בעברית
  viewAPIs: [...],                     // APIs לצפייה
  editAPIs: [...],                     // APIs לעריכה
  supportsEditMode: true,              // האם תומך במצב עריכה
  customModes: [...]                   // מצבי צפייה מותאמים אישית (אופציונלי)
}
```

### דפים זמינים במערכת

הדפים הזמינים במערכת:

1. **Dashboard** - לוח בקרה (view only)
2. **Students** - תלמידים (view + edit)
3. **Resources** - ניהול משאבים (view + edit)
4. **SOC** - מרכז אבטחה (view + edit)
5. **API Keys** - מפתחות API (view + edit)
6. **Settings** - הגדרות (view only)

**הערה:** דפים כמו "מגמות", "מחזורים", "כיתות" אינם דפים נפרדים - הם חלק מדף התלמידים.

---

## איך הרשאות ניתנות

### 1. הרשאות למשתמשים (User Permissions)

ניתן לתת הרשאות ישירות למשתמש ספציפי:

- **צפייה** - המשתמש יכול לראות את הדף
- **עריכה** - המשתמש יכול לערוך את הדף (כולל צפייה)

**דוגמה:**
```
משתמש: יוסי כהן
הרשאות:
  - students: view ✓
  - students: edit ✓
  - soc: view ✓
```

### 2. הרשאות לתפקידים (Role Permissions)

ניתן לתת הרשאות לתפקיד, וכל המשתמשים עם התפקיד הזה יקבלו את ההרשאות אוטומטית:

- **צפייה** - כל המשתמשים עם התפקיד יכולים לראות את הדף
- **עריכה** - כל המשתמשים עם התפקיד יכולים לערוך את הדף

**דוגמה:**
```
תפקיד: מורה
הרשאות:
  - students: view ✓
  - students: edit ✓

משתמשים עם התפקיד "מורה" יקבלו אוטומטית:
  - students: view ✓
  - students: edit ✓
```

### 3. הרשאות משולבות

משתמש יכול לקבל הרשאות גם ישירות וגם דרך תפקיד:

- אם יש הרשאה ישירה - היא תקפה
- אם יש הרשאה דרך תפקיד - היא תקפה
- אם יש שתיהן - הרשאה ישירה עדיפה

**דוגמה:**
```
משתמש: יוסי כהן
תפקיד: מורה (students: view, students: edit)
הרשאות ישירות: soc: view

הרשאות סופיות:
  - students: view ✓ (דרך תפקיד)
  - students: edit ✓ (דרך תפקיד)
  - soc: view ✓ (ישירה)
```

---

## הרשאות אוטומטיות

כשנותנים הרשאת דף, המערכת נותנת **אוטומטית** גם את כל ה-API permissions הקשורים לדף.

### איך זה עובד:

1. **הרשאת צפייה (View)**
   - נותנת את כל ה-APIs ב-`viewAPIs` של הדף
   - למשל: `students:read`, `tracks:read`, `cohorts:read`

2. **הרשאת עריכה (Edit)**
   - נותנת את כל ה-APIs ב-`viewAPIs` **וגם** ב-`editAPIs` של הדף
   - למשל: `students:read`, `students:create`, `students:update`, `students:delete`

### דוגמה:

**דף "תלמידים" עם הרשאת צפייה:**
```
viewAPIs:
  - students:read
  - tracks:read
  - cohorts:read
  - classes:read
```

**דף "תלמידים" עם הרשאת עריכה:**
```
viewAPIs + editAPIs:
  - students:read
  - students:create
  - students:update
  - students:delete
  - tracks:read
  - tracks:create
  - tracks:update
  - tracks:delete
  - cohorts:read
  - cohorts:create
  - cohorts:update
  - cohorts:refresh
  - classes:read
  - classes:create
  - classes:update
  - classes:delete
```

---

## הרשאות למשתמשים ולתפקידים

### הבדלים עיקריים:

| תכונה | משתמש | תפקיד |
|------|-------|-------|
| **הרשאות ישירות** | ✓ | ✗ |
| **הרשאות דרך תפקיד** | ✓ (אם יש תפקיד) | ✓ |
| **ניהול** | Permission Manager | Permission Manager |
| **השפעה** | רק על המשתמש | על כל המשתמשים עם התפקיד |

### מתי להשתמש במה:

**הרשאות למשתמש:**
- כשצריך לתת הרשאה ספציפית למשתמש אחד
- כשצריך לתת הרשאה זמנית
- כשצריך לתת הרשאה ייחודית שלא קשורה לתפקיד

**הרשאות לתפקיד:**
- כשצריך לתת הרשאה לכל המשתמשים עם תפקיד מסוים
- כשצריך לנהל הרשאות בצורה מרכזית
- כשצריך להגדיר הרשאות ברירת מחדל לתפקיד

---

## מצבי צפייה מותאמים אישית

חלק מהדפים תומכים במצבי צפייה מותאמים אישית (Custom View Modes). זה מאפשר להציג את אותו הדף בצורה שונה למשתמשים שונים.

### דוגמה:

**דף "תלמידים" עם מצבי צפייה:**
- **מורה** - רואה רק את התלמידים שלה
- **יועצת** - רואה את כל התלמידים + מידע נוסף
- **מנהל** - רואה הכל + יכול לערוך

### איך זה עובד:

1. הדף מוגדר עם `customModes` ב-`permission-registry.ts`
2. ניתן לתת למשתמש הרשאה למצב ספציפי
3. הדף מציג תוכן שונה בהתאם למצב

---

## ניהול הרשאות

### Permission Manager

ניתן לנהל הרשאות דרך ה-Permission Manager במערכת:

1. **גישה:** רק מנהלים יכולים לנהל הרשאות
2. **מצב:** רק במצב עריכה (Edit Mode)
3. **מיקום:** דף "ניהול משאבים" → ניהול הרשאות

### איך לנהל הרשאות:

1. **למשתמש:**
   - פתח את דף "ניהול משאבים"
   - לחץ על "ניהול הרשאות" ליד המשתמש
   - בחר דפים והרשאות (צפייה/עריכה)
   - לחץ "שמור"

2. **לתפקיד:**
   - פתח את דף "ניהול משאבים"
   - לחץ על "ניהול הרשאות" ליד התפקיד
   - בחר דפים והרשאות (צפייה/עריכה)
   - לחץ "שמור"

### כלים לייעול ניהול ההרשאות:

המערכת כוללת כלים רבים לייעול ניהול ההרשאות:

1. **תבניות הרשאות (Permission Presets)** - תבניות מוגדרות מראש שניתן להחיל בבת אחת
2. **העתקת הרשאות (Copy Permissions)** - העתקת הרשאות ממשתמש/תפקיד אחד לאחר
3. **פעולות מרובות (Bulk Operations)** - החלת מספר הרשאות בבת אחת

**למידע מפורט:** ראה [PERMISSIONS_OPTIMIZATION.md](./PERMISSIONS_OPTIMIZATION.md)

### הגבלות:

- **לא ניתן לערוך הרשאות עצמך** - מנהל לא יכול לערוך את ההרשאות שלו
- **רק משתמשים מאושרים** - רק משתמשים עם סטטוס `APPROVED` יכולים לקבל הרשאות
- **רק במצב עריכה** - ניהול הרשאות זמין רק במצב עריכה

---

## דוגמאות

### דוגמה 1: הרשאות בסיסיות

**משתמש חדש:**
```
הרשאות: אין
גישה: רק Dashboard
```

**אחרי מתן הרשאות:**
```
הרשאות:
  - students: view ✓
  - students: edit ✓

גישה:
  - Dashboard ✓
  - Students ✓ (צפייה + עריכה)
  - APIs: students:read, students:create, students:update, students:delete, tracks:read, cohorts:read, classes:read, ...
```

### דוגמה 2: הרשאות דרך תפקיד

**תפקיד "מורה":**
```
הרשאות:
  - students: view ✓
  - students: edit ✓
```

**משתמש עם תפקיד "מורה":**
```
הרשאות:
  - students: view ✓ (דרך תפקיד)
  - students: edit ✓ (דרך תפקיד)

גישה:
  - Dashboard ✓
  - Students ✓ (צפייה + עריכה)
```

### דוגמה 3: הרשאות משולבות

**משתמש: יוסי כהן**
```
תפקיד: מורה
  - students: view ✓
  - students: edit ✓

הרשאות ישירות:
  - soc: view ✓
```

**הרשאות סופיות:**
```
- students: view ✓ (דרך תפקיד)
- students: edit ✓ (דרך תפקיד)
- soc: view ✓ (ישירה)
```

---

## מבנה הקבצים

### Backend

```
backend/src/
├── lib/permissions/
│   ├── permission-registry.ts      # הגדרת כל הדפים וההרשאות
│   ├── permissions.ts               # פונקציות עזר להרשאות
│   ├── permission-middleware.ts     # Middleware לבדיקת הרשאות
│   └── api-permission-middleware.ts # Middleware לבדיקת הרשאות API
└── modules/permissions/
    ├── permissions.service.ts       # לוגיקת עסקים של הרשאות
    ├── permissions.controller.ts    # API endpoints להרשאות
    └── permissions.routes.ts        # הגדרת routes
```

### Frontend

```
frontend/src/
├── features/permissions/
│   ├── PermissionsContext.tsx       # Context להרשאות
│   └── PageModeContext.tsx          # Context למצב דף (view/edit)
└── features/resources/
    └── PermissionManagerModal.tsx  # UI לניהול הרשאות
```

---

## API Endpoints

### קבלת הרשאות

```
GET /api/permissions/pages
  - קבלת רשימת כל הדפים וההרשאות שלהם

GET /api/permissions/my-page-permissions
  - קבלת הרשאות הדפים של המשתמש הנוכחי

GET /api/permissions/users/:userId/page-permissions
  - קבלת הרשאות הדפים של משתמש ספציפי

GET /api/permissions/roles/:roleId/page-permissions
  - קבלת הרשאות הדפים של תפקיד ספציפי
```

### ניהול הרשאות

```
POST /api/permissions/users/:userId/grant-page
  - מתן הרשאת דף למשתמש
  Body: { page: 'students', action: 'view' | 'edit' }

POST /api/permissions/users/:userId/revoke-page
  - הסרת הרשאת דף ממשתמש
  Body: { page: 'students', action: 'view' | 'edit' }

POST /api/permissions/roles/:roleId/grant-page
  - מתן הרשאת דף לתפקיד
  Body: { page: 'students', action: 'view' | 'edit' }

POST /api/permissions/roles/:roleId/revoke-page
  - הסרת הרשאת דף מתפקיד
  Body: { page: 'students', action: 'view' | 'edit' }
```

### כלים לייעול

```
GET  /api/permissions/presets
  - קבלת כל תבניות ההרשאות

POST /api/permissions/users/:userId/apply-preset
  - החלת תבנית הרשאות על משתמש
  Body: { presetId: 'teacher' }

POST /api/permissions/roles/:roleId/apply-preset
  - החלת תבנית הרשאות על תפקיד
  Body: { presetId: 'teacher' }

POST /api/permissions/users/:userId/copy-from-user
  - העתקת הרשאות ממשתמש למשתמש
  Body: { sourceUserId: 5 }

POST /api/permissions/users/:userId/copy-from-role
  - העתקת הרשאות מתפקיד למשתמש
  Body: { roleId: 3 }

POST /api/permissions/roles/:roleId/copy-from-role
  - העתקת הרשאות מתפקיד לתפקיד
  Body: { sourceRoleId: 3 }

POST /api/permissions/users/:userId/bulk-grant-page
  - החלת מספר הרשאות על משתמש
  Body: { permissions: [{ page: 'students', action: 'view' }, ...] }

POST /api/permissions/roles/:roleId/bulk-grant-page
  - החלת מספר הרשאות על תפקיד
  Body: { permissions: [{ page: 'students', action: 'view' }, ...] }
```

---

## כללי אבטחה

### 1. בדיקת הרשאות

כל API endpoint ב-backend בודק הרשאות לפני ביצוע פעולה:

```typescript
// בדיקת הרשאת דף
if (!hasPagePermission(user, 'students', 'view')) {
  return res.status(403).json({ error: 'Forbidden' });
}

// בדיקת הרשאת API
if (!hasAPIPermission(user, 'students', 'read')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 2. מנהלים (Admins)

מנהלים (`isAdmin: true`) מקבלים **אוטומטית** את כל ההרשאות במערכת, ללא צורך להגדיר אותם במפורש.

### 3. משתמשים לא מאושרים

רק משתמשים עם סטטוס `APPROVED` יכולים לקבל הרשאות. משתמשים עם סטטוס `PENDING` או `REJECTED` לא יכולים לקבל הרשאות.

---

## טיפים וכללי אצבע

### 1. מתי להשתמש בהרשאות למשתמשים

- הרשאות ספציפיות למשתמש אחד
- הרשאות זמניות
- הרשאות ייחודיות שלא קשורות לתפקיד

### 2. מתי להשתמש בהרשאות לתפקידים

- הרשאות לכל המשתמשים עם תפקיד מסוים
- ניהול הרשאות מרכזי
- הרשאות ברירת מחדל לתפקיד

### 3. איך לעצב הרשאות

- **מינימלי** - תן רק את ההרשאות הנדרשות
- **ברור** - השתמש בשמות ברורים ומתאימים
- **עקבי** - השתמש באותם עקרונות לכל הדפים

---

## פתרון בעיות

### בעיה: משתמש לא יכול לגשת לדף

**פתרונות:**
1. בדוק שהמשתמש יש לו הרשאת צפייה לדף
2. בדוק שהמשתמש מאושר (`APPROVED`)
3. בדוק שהמשתמש לא מנהל (אם כן, הוא צריך לקבל הרשאות אוטומטית)
4. בדוק את ה-console logs ב-backend

### בעיה: משתמש לא יכול לבצע פעולה

**פתרונות:**
1. בדוק שהמשתמש יש לו הרשאת עריכה לדף
2. בדוק שהמשתמש יש לו הרשאת API הנדרשת
3. בדוק את ה-console logs ב-backend
4. בדוק את ה-network tab ב-frontend

### בעיה: הרשאות לא מתעדכנות

**פתרונות:**
1. רענן את הדף
2. בדוק שההרשאות נשמרו ב-database
3. בדוק את ה-console logs ב-backend
4. בדוק שהמשתמש לא מנהל (אם כן, הוא צריך לקבל הרשאות אוטומטית)

---

## סיכום

מערכת ההרשאות במערכת מבוססת על:

1. **הרשאות דפים** - הרשאות לגשת לדפים ספציפיים
2. **הרשאות API** - הרשאות לגשת ל-endpoints ספציפיים
3. **הרשאות אוטומטיות** - כשנותנים הרשאת דף, נותנים גם את ה-APIs שלו
4. **הרשאות למשתמשים ולתפקידים** - ניתן לתת הרשאות ישירות או דרך תפקיד
5. **מצבי צפייה מותאמים אישית** - חלק מהדפים תומכים במצבי צפייה שונים

המערכת מבטיחה אבטחה מלאה וניהול הרשאות גמיש ויעיל.
