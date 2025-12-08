# Trusted Users Whitelist System

## Overview

המערכת מאפשרת להוסיף משתמשים מהימנים (מפתחים, אדמינים) ל-whitelist כדי שיוכלו:
- להעלות קבצים גדולים (עד 50MB במקום 10MB)
- לבצע יותר פעולות (rate limiting גבוה יותר)
- לא להיחסם אוטומטית על ידי מערכת ה-IP blocking

## איך להוסיף משתמש מהימן

### דרך API (SOC Dashboard)

1. **להוסיף לפי User ID:**
```bash
POST /api/soc/trusted-users
{
  "userId": 1,
  "name": "Developer Account",
  "reason": "Developer - needs higher limits",
  "expiresAt": "2025-12-31T23:59:59Z" // Optional
}
```

2. **להוסיף לפי IP Address:**
```bash
POST /api/soc/trusted-users
{
  "ipAddress": "192.168.1.100",
  "name": "Office IP",
  "reason": "Office network - trusted",
  "expiresAt": null // Permanent
}
```

3. **להוסיף לפי Email:**
```bash
POST /api/soc/trusted-users
{
  "email": "developer@example.com",
  "name": "Developer Email",
  "reason": "Developer account"
}
```

### דרך Frontend (SOC Dashboard)

1. היכנס ל-SOC Dashboard
2. לחץ על "Trusted Users" tab
3. הוסף משתמש חדש עם הפרטים הנדרשים

## מה מקבלים משתמשים מהימנים?

### Rate Limiting
- **משתמשים רגילים**: 100 בקשות ל-15 דקות
- **משתמשים מהימנים**: ללא הגבלה (skip rate limiting)

### Strict Rate Limiting (פעולות רגישות)
- **משתמשים רגילים**: 10 בקשות ל-15 דקות
- **משתמשים מהימנים**: 100 בקשות ל-15 דקות

### File Upload
- **משתמשים רגילים**: 
  - 5 העלאות לשעה
  - קבצים עד 10MB
- **משתמשים מהימנים**:
  - 50 העלאות לשעה
  - קבצים עד 50MB

### IP Blocking
- משתמשים מהימנים **לא נחסמים** אוטומטית, גם אם ה-IP שלהם נחסם

## Security Best Practices

1. **השתמש ב-expiration dates** - אל תוסיף משתמשים מהימנים ללא תאריך תפוגה
2. **תן סיבה ברורה** - תמיד תן סיבה מדוע משתמש נוסף ל-whitelist
3. **בדוק באופן קבוע** - סקור את רשימת המשתמשים המהימנים באופן קבוע
4. **הסר משתמשים ישנים** - הסר משתמשים מהימנים שכבר לא פעילים

## API Endpoints

- `GET /api/soc/trusted-users` - קבל את כל המשתמשים המהימנים
- `POST /api/soc/trusted-users` - הוסף משתמש מהימן חדש
- `DELETE /api/soc/trusted-users/:id` - הסר משתמש מהימן

## דוגמה: הוספת עצמך ל-whitelist

אם אתה מפתח ורוצה להוסיף את עצמך:

```bash
# 1. קבל את ה-User ID שלך מהטוקן
# 2. הוסף את עצמך:
POST /api/soc/trusted-users
Authorization: Bearer <your-jwt-token>
{
  "userId": <your-user-id>,
  "ipAddress": "<your-current-ip>",
  "name": "My Developer Account",
  "reason": "Developer - needs higher limits for testing"
}
```

או פשוט לפי IP:

```bash
POST /api/soc/trusted-users
{
  "ipAddress": "<your-ip-address>",
  "name": "My Development IP",
  "reason": "Developer IP"
}
```

## הערות חשובות

- משתמשים מהימנים עדיין נדרשים לאמת (authentication)
- המערכת בודקת גם userId וגם IP address
- אם משתמש מהימן משתמש ב-API key, ה-API key צריך להיות קשור ל-userId מהימן
- תאריכי תפוגה הם אופציונליים - אם לא מצוין, המשתמש נשאר מהימן עד להסרה ידנית
