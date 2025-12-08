# Guides & How-To Documentation

מדריכים והנחיות לשימוש במערכת.

## 📋 קבצים

- **[HOW_TO_CHECK_ADMIN.md](./HOW_TO_CHECK_ADMIN.md)** - איך לבדוק אם משתמש הוא admin
  - Frontend methods
  - Backend methods
  - Database queries
  - React hooks

- **[LARGE_FILE_UPLOADS.md](./LARGE_FILE_UPLOADS.md)** - העלאת קבצים גדולים
  - File size limits (Regular/Trusted/Admin)
  - Best practices
  - Troubleshooting

- **[RATE_LIMITING_EXPLAINED.md](./RATE_LIMITING_EXPLAINED.md)** - הסבר על rate limiting
  - למה צריך rate limiting
  - איך חברות גדולות עושות את זה
  - השוואה למערכת שלנו

- **[UNBLOCK_IP_GUIDE.md](./UNBLOCK_IP_GUIDE.md)** - איך לבטל חסימת IP
  - דרך SOC Dashboard
  - דרך scripts
  - דרך database

- **[DATABASE_SEEDING.md](./DATABASE_SEEDING.md)** - מדריך ל-Database Seeding
  - יצירת משתמש אדמין ראשוני
  - הגדרת משתני סביבה
  - Auto-seed אוטומטי
  - פתרון בעיות

## 🎯 שימוש מהיר

### בדיקת Admin
```typescript
const user = await apiClient.get('/auth/me');
const isAdmin = user.data.isAdmin;
```

### העלאת קובץ גדול
```bash
# Trusted users: עד 200MB
# Admin: עד 500MB
POST /api/students/upload
```

### ביטול חסימת IP
```bash
cd backend
npx tsx scripts/unblock-ip.ts YOUR_IP_ADDRESS
```
