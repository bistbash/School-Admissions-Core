# ייעול מערכת ההרשאות - Permissions Optimization

מדריך על הדרכים לייעל את ניהול ההרשאות במערכת.

---

## סקירה כללית

מערכת ההרשאות כוללת מספר כלים לייעול ניהול ההרשאות:

1. **תבניות הרשאות (Permission Presets)** - תבניות מוגדרות מראש
2. **העתקת הרשאות (Copy Permissions)** - העתקת הרשאות ממשתמש/תפקיד אחד לאחר
3. **פעולות מרובות (Bulk Operations)** - החלת הרשאות מרובות בבת אחת

---

## תבניות הרשאות (Permission Presets)

### מה זה?

תבניות הרשאות הן קבוצות מוגדרות מראש של הרשאות שניתן להחיל על משתמש או תפקיד בבת אחת, במקום להגדיר כל הרשאה בנפרד.

### תבניות זמינות:

1. **מורה (Teacher)**
   - Dashboard: view
   - Students: edit

2. **יועצת (Counselor)**
   - Dashboard: view
   - Students: view
   - SOC: view

3. **מנהל (Administrator)**
   - Dashboard: view
   - Students: edit
   - Resources: edit
   - SOC: edit
   - API Keys: edit
   - Settings: view

4. **מפקד (Commander)**
   - Dashboard: view
   - Students: view
   - Resources: edit
   - SOC: view

5. **צופה (Viewer)**
   - Dashboard: view
   - Students: view
   - SOC: view

6. **מפתח API (API Developer)**
   - Dashboard: view
   - API Keys: edit

### איך להשתמש:

#### דרך API:

```bash
# החלת תבנית על משתמש
POST /api/permissions/users/:userId/apply-preset
Body: { presetId: 'teacher' }

# החלת תבנית על תפקיד
POST /api/permissions/roles/:roleId/apply-preset
Body: { presetId: 'teacher' }

# קבלת כל התבניות
GET /api/permissions/presets
```

#### דוגמה:

```javascript
// החלת תבנית "מורה" על משתמש
await apiClient.post('/api/permissions/users/5/apply-preset', {
  presetId: 'teacher'
});

// התוצאה: המשתמש מקבל אוטומטית:
// - dashboard: view
// - students: edit
// + כל ה-APIs הקשורים
```

---

## העתקת הרשאות (Copy Permissions)

### מה זה?

העתקת הרשאות ממשתמש או תפקיד אחד לאחר, כדי לחסוך זמן בהגדרת הרשאות זהות.

### אפשרויות:

1. **העתקת הרשאות ממשתמש למשתמש**
   - מעתיק את כל ההרשאות של משתמש אחד למשתמש אחר

2. **העתקת הרשאות מתפקיד למשתמש**
   - מעתיק את כל ההרשאות של תפקיד למשתמש

3. **העתקת הרשאות מתפקיד לתפקיד**
   - מעתיק את כל ההרשאות של תפקיד אחד לתפקיד אחר

### איך להשתמש:

#### דרך API:

```bash
# העתקת הרשאות ממשתמש למשתמש
POST /api/permissions/users/:targetUserId/copy-from-user
Body: { sourceUserId: 5 }

# העתקת הרשאות מתפקיד למשתמש
POST /api/permissions/users/:userId/copy-from-role
Body: { roleId: 3 }

# העתקת הרשאות מתפקיד לתפקיד
POST /api/permissions/roles/:targetRoleId/copy-from-role
Body: { sourceRoleId: 3 }
```

#### דוגמה:

```javascript
// העתקת הרשאות ממשתמש 5 למשתמש 10
await apiClient.post('/api/permissions/users/10/copy-from-user', {
  sourceUserId: 5
});

// התוצאה: משתמש 10 מקבל את כל ההרשאות של משתמש 5
```

---

## פעולות מרובות (Bulk Operations)

### מה זה?

החלת מספר הרשאות בבת אחת, במקום לתת כל הרשאה בנפרד.

### איך להשתמש:

#### דרך API:

```bash
# החלת מספר הרשאות על משתמש
POST /api/permissions/users/:userId/bulk-grant-page
Body: {
  permissions: [
    { page: 'students', action: 'view' },
    { page: 'students', action: 'edit' },
    { page: 'soc', action: 'view' }
  ]
}

# החלת מספר הרשאות על תפקיד
POST /api/permissions/roles/:roleId/bulk-grant-page
Body: {
  permissions: [
    { page: 'students', action: 'view' },
    { page: 'students', action: 'edit' }
  ]
}
```

#### דוגמה:

```javascript
// החלת מספר הרשאות על משתמש
await apiClient.post('/api/permissions/users/5/bulk-grant-page', {
  permissions: [
    { page: 'students', action: 'view' },
    { page: 'students', action: 'edit' },
    { page: 'soc', action: 'view' }
  ]
});

// התוצאה: המשתמש מקבל את כל ההרשאות בבת אחת
```

---

## מתי להשתמש במה?

### תבניות הרשאות (Presets)

**מתי להשתמש:**
- כשצריך לתת הרשאות סטנדרטיות למשתמש/תפקיד
- כשצריך להגדיר הרשאות ברירת מחדל
- כשצריך להחיל הרשאות מוגדרות מראש

**דוגמה:**
```
משתמש חדש: "מורה"
→ החלת תבנית "teacher"
→ מקבל אוטומטית: dashboard (view), students (edit)
```

### העתקת הרשאות (Copy)

**מתי להשתמש:**
- כשצריך לתת הרשאות זהות למספר משתמשים
- כשצריך לשכפל הרשאות מתפקיד למשתמש
- כשצריך לשכפל הרשאות מתפקיד לתפקיד

**דוגמה:**
```
משתמש חדש: "יוסי כהן"
→ העתקת הרשאות ממשתמש "דני לוי"
→ מקבל את כל ההרשאות של דני
```

### פעולות מרובות (Bulk)

**מתי להשתמש:**
- כשצריך לתת מספר הרשאות בבת אחת
- כשצריך להגדיר הרשאות מותאמות אישית
- כשצריך לעדכן מספר הרשאות בבת אחת

**דוגמה:**
```
משתמש: "יוסי כהן"
→ החלת הרשאות מרובות:
  - students: view
  - students: edit
  - soc: view
→ מקבל את כל ההרשאות בבת אחת
```

---

## שילוב כלים

ניתן לשלב את הכלים השונים:

### דוגמה 1: תבנית + הרשאות נוספות

```javascript
// 1. החלת תבנית בסיסית
await apiClient.post('/api/permissions/users/5/apply-preset', {
  presetId: 'teacher'
});

// 2. הוספת הרשאות נוספות
await apiClient.post('/api/permissions/users/5/bulk-grant-page', {
  permissions: [
    { page: 'soc', action: 'view' }
  ]
});
```

### דוגמה 2: העתקה + עדכון

```javascript
// 1. העתקת הרשאות ממשתמש אחר
await apiClient.post('/api/permissions/users/10/copy-from-user', {
  sourceUserId: 5
});

// 2. הוספת הרשאות נוספות
await apiClient.post('/api/permissions/users/10/bulk-grant-page', {
  permissions: [
    { page: 'api-keys', action: 'edit' }
  ]
});
```

---

## יצירת תבניות מותאמות אישית

ניתן להוסיף תבניות מותאמות אישית ב-`permission-presets.ts`:

```typescript
export const PERMISSION_PRESETS: Record<string, PermissionPreset> = {
  // תבנית מותאמת אישית
  'my-custom-preset': {
    id: 'my-custom-preset',
    name: 'My Custom Preset',
    nameHebrew: 'התבנית המותאמת שלי',
    description: 'Custom preset description',
    descriptionHebrew: 'תיאור התבנית המותאמת',
    permissions: [
      { page: 'dashboard', action: 'view' },
      { page: 'students', action: 'edit' },
      { page: 'soc', action: 'view' },
    ],
  },
};
```

---

## סיכום

מערכת ההרשאות כוללת כלים רבים לייעול ניהול ההרשאות:

1. **תבניות הרשאות** - להחלת הרשאות מוגדרות מראש
2. **העתקת הרשאות** - לשכפול הרשאות ממשתמש/תפקיד אחד לאחר
3. **פעולות מרובות** - להחלת מספר הרשאות בבת אחת

שימוש בכלים אלה יכול לחסוך זמן רב בניהול ההרשאות ולהפוך את התהליך לפשוט ויעיל יותר.

---

## API Reference

### Presets

```
GET    /api/permissions/presets
POST   /api/permissions/users/:userId/apply-preset
POST   /api/permissions/roles/:roleId/apply-preset
```

### Copy Permissions

```
POST   /api/permissions/users/:userId/copy-from-user
POST   /api/permissions/users/:userId/copy-from-role
POST   /api/permissions/roles/:roleId/copy-from-role
```

### Bulk Operations

```
POST   /api/permissions/users/:userId/bulk-grant-page
POST   /api/permissions/roles/:roleId/bulk-grant-page
```
