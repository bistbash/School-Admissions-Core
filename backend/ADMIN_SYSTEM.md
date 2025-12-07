# Admin System Documentation

## Overview

המערכת כוללת מערכת admin אוטומטית שבה **המשתמש הראשון שנרשם** הופך אוטומטית ל-admin עם כל ההרשאות.

## איך זה עובד?

### 1. Registration של המשתמש הראשון

כאשר משתמש נרשם לראשונה במערכת:
- המערכת בודקת אם יש כבר משתמשים במערכת
- אם אין משתמשים קיימים, המשתמש החדש מקבל `isAdmin = true`
- המשתמש נוסף אוטומטית ל-Trusted Users whitelist
- המשתמש מקבל הרשאות מלאות

### 2. Admin Privileges

משתמש admin יכול:
- ✅ לנהל Trusted Users (הוספה/הסרה)
- ✅ לחסום/לבטל חסימת IP addresses
- ✅ למחוק את כל התלמידים (clear-all)
- ✅ לבצע קידום שנתי (promote-all)
- ✅ לבצע קידום מחזור (promote cohort)
- ✅ להעלות קבצים גדולים (עד 50MB)
- ✅ ללא הגבלות rate limiting

### 3. Protected Endpoints

הנקודות הבאות דורשות admin בלבד:

**SOC/System Management:**
- `GET /api/soc/blocked-ips` - רשימת IPs חסומים
- `POST /api/soc/block-ip` - חסימת IP
- `POST /api/soc/unblock-ip` - ביטול חסימת IP
- `GET /api/soc/trusted-users` - רשימת משתמשים מהימנים
- `POST /api/soc/trusted-users` - הוספת משתמש מהימן
- `DELETE /api/soc/trusted-users/:id` - הסרת משתמש מהימן

**Students Management:**
- `DELETE /api/students/clear-all` - מחיקת כל התלמידים
- `POST /api/students/promote-all` - קידום שנתי
- `POST /api/students/cohorts/:cohortId/promote` - קידום מחזור

## Security Features

### 1. Admin Check
- כל בקשה ל-endpoint מוגן בודקת את `isAdmin` מה-database
- לא ניתן לזייף את הסטטוס - הוא נשמר ב-database בלבד
- כל ניסיון גישה לא מורשית נרשם ב-audit log

### 2. Automatic Whitelist
- Admin נוסף אוטומטית ל-Trusted Users whitelist
- Admin לא נחסם על ידי IP blocking
- Admin לא מוגבל על ידי rate limiting

### 3. Single Admin
- רק המשתמש הראשון יכול להיות admin
- לא ניתן לשנות את זה דרך API
- רק דרך database ישירות (אם צריך)

## API Usage

### בדיקה אם משתמש הוא admin

```typescript
// Frontend - check user.isAdmin from /api/auth/me
const user = await apiClient.get('/auth/me');
if (user.data.isAdmin) {
  // Show admin features
}
```

### Backend - requireAdmin middleware

```typescript
import { requireAdmin } from '../../lib/security';

router.post('/sensitive-endpoint', requireAdmin, controller.method);
```

## Database Schema

```prisma
model Soldier {
  // ... other fields
  isAdmin Boolean @default(false) // Admin user - first registered user becomes admin
  @@index([isAdmin])
}
```

## Migration

המיגרציה `add_admin_to_soldier`:
1. מוסיפה את השדה `isAdmin` ל-Soldier
2. מסמנת את המשתמש הראשון (הכי ישן) כ-admin
3. מוסיפה את ה-admin ל-Trusted Users whitelist

## Best Practices

1. **שמור על ה-admin account בטוח** - השתמש בסיסמה חזקה
2. **אל תשתף את ה-admin credentials** - רק למפתח הראשי
3. **בדוק את ה-audit logs** - עקוב אחר פעולות admin
4. **השתמש ב-Trusted Users** - הוסף משתמשים נוספים ל-whitelist במקום לתת להם admin

## Troubleshooting

### איך לבדוק מי הוא ה-admin?

```sql
SELECT id, email, name, isAdmin, createdAt 
FROM Soldier 
WHERE isAdmin = 1;
```

### איך להפוך משתמש קיים ל-admin?

```sql
-- רק אם באמת צריך (לא מומלץ)
UPDATE Soldier 
SET isAdmin = 1 
WHERE id = <user_id>;
```

### איך להוסיף admin ל-Trusted Users ידנית?

```sql
INSERT INTO TrustedUser (userId, email, name, reason, isActive, createdAt)
SELECT id, email, name || ' (Admin)', 'Manual admin addition', 1, CURRENT_TIMESTAMP
FROM Soldier
WHERE isAdmin = 1;
```

## Notes

- **רק משתמש אחד יכול להיות admin** - המשתמש הראשון שנרשם
- **Admin status נשמר ב-database** - לא ב-JWT token (בטיחות)
- **Admin checks נעשים מה-database** - לא ניתן לזייף
- **Admin נוסף אוטומטית ל-whitelist** - מקבל הרשאות מיוחדות
