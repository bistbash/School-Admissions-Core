# Features Documentation

תיעוד תכונות המערכת.

## 📋 קבצים

- **[ADMIN_SYSTEM.md](./ADMIN_SYSTEM.md)** - מערכת ניהול מנהלים
  - איך המשתמש הראשון הופך ל-admin
  - הרשאות admin
  - Protected endpoints

- **[PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)** - מערכת הרשאות
  - Page-based permissions
  - API permissions
  - Role and user permissions

- **[COHORTS_API.md](./COHORTS_API.md)** - API למחזורים
  - כל ה-endpoints למחזורים
  - דוגמאות שימוש
  - Validation rules

- **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md)** - מערכת לוגים ואבטחה
  - Audit logging
  - SOC API
  - Security monitoring

## 🚀 שימוש מהיר

### Admin System
```typescript
// בדיקה אם משתמש הוא admin
const user = await apiClient.get('/auth/me');
if (user.data.isAdmin) {
  // Admin features
}
```

### Permissions
```typescript
// בדיקת הרשאות
const { hasPagePermission } = usePermissions();
if (hasPagePermission('students', 'view')) {
  // Show students page
}
```

### Cohorts API
```typescript
// קבלת כל המחזורים
const cohorts = await apiClient.get('/cohorts?isActive=true');
```
