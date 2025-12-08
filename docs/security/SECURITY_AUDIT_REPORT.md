# דוח ביקורת אבטחה - School Admissions Core

**תאריך:** 2025-01-07  
**מצב:** ביקורת ראשונית

---

## 📋 סיכום מנהלים

המערכת כוללת **אמצעי אבטחה בסיסיים טובים**, אך יש מספר **פרצות אבטחה** ו**הדלפות מידע** שדורשות תיקון לפני פריסה לפרודקשן.

### דירוג כללי: ⚠️ **7/10** - טוב, אך דורש שיפורים

---

## ✅ אמצעי אבטחה קיימים (מה שעובד טוב)

### 1. **הצפנת סיסמאות**
- ✅ שימוש ב-`bcrypt` עם 12 סיבובים (חזק)
- ✅ סיסמאות לא נשמרות בטקסט פשוט
- ✅ סיסמאות לא מוחזרות בתגובות API

### 2. **אימות JWT**
- ✅ טוקנים עם תאריך תפוגה (7 ימים)
- ✅ אלגוריתם HS256
- ✅ אימות על כל בקשה מוגנת

### 3. **מפתחות API**
- ✅ הצפנה עם SHA-256 לפני אחסון
- ✅ מפתחות לא נשמרים בטקסט פשוט
- ✅ מפתחות לא נכתבים ללוגים
- ✅ מפתחות לא מוחזרים בתגובות GET

### 4. **הגנה מפני התקפות**
- ✅ Rate Limiting (הגבלת קצב בקשות)
- ✅ IP Blocking (חסימת כתובות IP)
- ✅ CSRF Protection (הגנה מפני CSRF)
- ✅ Helmet.js (כותרות אבטחה)

### 5. **אימות קלט**
- ✅ שימוש ב-Zod לבדיקת קלט
- ✅ בדיקת סוגי קבצים בהעלאה
- ✅ הגבלת גודל קבצים

### 6. **הגנה מפני SQL Injection**
- ✅ שימוש ב-Prisma ORM (מונע SQL injection)
- ✅ פרמטרים מוכנים (prepared statements)

### 7. **ניהול שגיאות**
- ✅ הודעות שגיאה לא חושפות מידע רגיש (ברוב המקרים)
- ✅ לוגים מפורטים רק במצב development

### 8. **אבטחת רשת**
- ✅ CORS מוגדר
- ✅ HTTPS נאכף בפרודקשן
- ✅ Content Security Policy

---

## ⚠️ פרצות אבטחה שדורשות תיקון

### 🔴 **קריטי - תיקון מיידי**

#### 1. **הדלפת מידע בשגיאות (Development Mode)**
**מיקום:** `backend/src/lib/errors.ts:98`

```typescript
return res.status(500).json({
  error: 'Internal server error',
  ...(process.env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : {}),
});
```

**בעיה:** במצב development, שגיאות חושפות stack traces ו-messages שעלולים להכיל מידע רגיש.

**סיכון:** 
- חשיפת מבנה הקוד
- חשיפת נתיבי קבצים
- חשיפת מידע על מסד הנתונים

**תיקון מומלץ:**
```typescript
return res.status(500).json({
  error: 'Internal server error',
  // רק במצב development מקומי, לא בסטייג'ינג
  ...(process.env.NODE_ENV === 'development' && process.env.ALLOW_DEBUG === 'true' 
    ? { message: err.message, stack: err.stack } 
    : {}),
});
```

---

#### 2. **JWT_SECRET Fallback - סיכון בפרודקשן**
**מיקום:** `backend/src/lib/auth.ts:24`

```typescript
const SECRET = JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-DEVELOPMENT-ONLY';
```

**בעיה:** אם `JWT_SECRET` לא מוגדר, המערכת משתמשת במפתח ברירת מחדל.

**סיכון:** 
- אם זה קורה בפרודקשן, כל הטוקנים חשופים
- מפתח ברירת מחדל ידוע

**תיקון מומלץ:**
```typescript
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET must be set. Application cannot start without it.');
}
const SECRET = JWT_SECRET;
```

---

#### 3. **לוגים שעלולים לחשוף מידע רגיש**
**מיקום:** מספר מקומות ב-`console.error`

**בעיה:** לוגים עלולים להכיל:
- פרטי שגיאות עם מידע על המבנה
- פרמטרים של בקשות
- מידע על משתמשים

**דוגמאות:**
- `backend/src/lib/errors.ts:60` - לוג של Prisma panic
- `backend/src/lib/errors.ts:94` - לוג של שגיאות לא צפויות

**תיקון מומלץ:**
- סניטיזציה של לוגים לפני כתיבה
- הסרת מידע רגיש (סיסמאות, טוקנים, מפתחות)
- שימוש ב-logging service מקצועי

---

### 🟡 **בינוני - תיקון מומלץ**

#### 4. **אימות קבצים - רק MIME Type**
**מיקום:** `backend/src/modules/students/students-upload.controller.ts:18-30`

**בעיה:** המערכת בודקת רק את ה-MIME type, לא את תוכן הקובץ בפועל.

**סיכון:**
- התקפת file upload עם קובץ מזויף
- קובץ יכול להיות מסוכן למרות MIME type תקין

**תיקון מומלץ:**
```typescript
// בדיקת חתימה קבצים (file signature/magic bytes)
import { fileTypeFromBuffer } from 'file-type';

const buffer = req.file.buffer;
const fileType = await fileTypeFromBuffer(buffer);
if (!fileType || !['xlsx', 'xls'].includes(fileType.ext)) {
  throw new Error('Invalid file type');
}
```

---

#### 5. **אין בדיקת חוזק סיסמה בשרת**
**מיקום:** `backend/src/modules/auth/auth.routes.ts:14`

**בעיה:** בדיקת אורך מינימלי (8 תווים) בלבד, ללא דרישות מורכבות.

**סיכון:**
- סיסמאות חלשות
- קלות לניחוש/brute force

**תיקון מומלץ:**
```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

---

#### 6. **JWT Tokens ב-localStorage - סיכון XSS**
**מיקום:** Frontend (לא נבדק בפירוט)

**בעיה:** טוקנים נשמרים ב-localStorage, רגישים להתקפות XSS.

**סיכון:**
- אם יש XSS, התוקף יכול לגנוב טוקנים
- אין הגנה מפני XSS ב-localStorage

**תיקון מומלץ:**
- העברת טוקנים ל-httpOnly cookies
- או שימוש ב-sessionStorage (פחות בטוח)
- או שימוש ב-Refresh Tokens + Access Tokens

---

#### 7. **אין מנגנון Token Refresh**
**בעיה:** טוקנים תקפים למשך 7 ימים, ללא אפשרות לחדש.

**סיכון:**
- משתמשים נאלצים להתחבר מחדש
- טוקנים ארוכי טווח = סיכון גדול יותר אם נגנבו

**תיקון מומלץ:**
- Access Tokens קצרי טווח (15 דקות)
- Refresh Tokens ארוכי טווח (7 ימים)
- מנגנון אוטומטי לרענון

---

#### 8. **אין הגנה מפני Brute Force ייעודית**
**בעיה:** יש rate limiting כללי, אך לא הגנה ספציפית לניסיונות התחברות.

**סיכון:**
- ניסיונות brute force על התחברות
- ניחוש סיסמאות

**תיקון מומלץ:**
```typescript
// Rate limiter ספציפי להתחברות
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 5, // רק 5 ניסיונות התחברות
  skipSuccessfulRequests: true, // לא לספור ניסיונות מוצלחים
});
```

---

### 🟢 **נמוך - שיפורים מומלצים**

#### 9. **CORS - יכול להיות יותר מגביל**
**מיקום:** `backend/src/server.ts:66-70`

**בעיה:** CORS מאפשר origin אחד, אך יכול להיות יותר ספציפי.

**תיקון מומלץ:**
```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      // רק origins מורשים
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
```

---

#### 10. **אין Rate Limiting על endpoints ספציפיים**
**בעיה:** Rate limiting כללי, אך לא על endpoints רגישים.

**תיקון מומלץ:**
- Rate limiting נפרד ל:
  - `/api/auth/login` - 5 ניסיונות/15 דקות
  - `/api/auth/register` - 1 ניסיון/שעה
  - `/api/api-keys` - 10 בקשות/דקה

---

#### 11. **אין Input Sanitization ל-XSS**
**בעיה:** אין ניקוי קלט מפני XSS (אם יש תצוגה של קלט משתמש).

**תיקון מומלץ:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}
```

---

#### 12. **לוגים עם console.error - לא מקצועי**
**בעיה:** שימוש ב-console.error במקום מערכת לוגים מקצועית.

**תיקון מומלץ:**
- שימוש ב-Winston או Pino
- רמות לוג (error, warn, info, debug)
- סניטיזציה אוטומטית

---

## 📊 סיכום פרצות

| סוג פרצה | כמות | חומרה | סטטוס |
|----------|------|--------|-------|
| הדלפת מידע | 3 | 🔴 גבוהה | דורש תיקון |
| אימות חלש | 2 | 🟡 בינונית | מומלץ |
| הגנה חסרה | 4 | 🟡 בינונית | מומלץ |
| שיפורים | 3 | 🟢 נמוכה | אופציונלי |

---

## 🛡️ המלצות לתיקון מיידי

### עדיפות 1 (קריטי):
1. ✅ תיקון הדלפת stack traces ב-development
2. ✅ הסרת JWT_SECRET fallback
3. ✅ סניטיזציה של לוגים

### עדיפות 2 (מומלץ):
4. ✅ אימות תוכן קבצים (לא רק MIME type)
5. ✅ בדיקת חוזק סיסמה בשרת
6. ✅ Rate limiting ספציפי להתחברות
7. ✅ מנגנון Token Refresh

### עדיפות 3 (שיפורים):
8. ✅ מעבר ל-httpOnly cookies
9. ✅ מערכת לוגים מקצועית
10. ✅ Input sanitization

---

## ✅ מה עובד טוב

המערכת כוללת:
- ✅ הצפנת סיסמאות חזקה
- ✅ אימות JWT תקין
- ✅ הגנה מפני SQL Injection
- ✅ Rate Limiting
- ✅ IP Blocking
- ✅ CSRF Protection
- ✅ Audit Logging
- ✅ Security Headers (Helmet)

**הבסיס טוב, רק צריך לחזק את הפרטים.**

---

## 📝 הערות נוספות

1. **מסד נתונים:** Prisma מספק הגנה טובה מפני SQL Injection
2. **API Keys:** מנוהלים בצורה בטוחה (הצפנה, לא בלוגים)
3. **Audit Logging:** מערכת לוגים טובה, אך דורשת סניטיזציה
4. **Environment Variables:** חשוב לוודא שכל המשתנים מוגדרים בפרודקשן

---

## 🎯 תוכנית פעולה מומלצת

### שבוע 1:
- [ ] תיקון הדלפות מידע קריטיות
- [ ] הסרת JWT_SECRET fallback
- [ ] סניטיזציה של לוגים

### שבוע 2:
- [ ] אימות קבצים משופר
- [ ] בדיקת חוזק סיסמה
- [ ] Rate limiting ספציפי

### שבוע 3:
- [ ] מנגנון Token Refresh
- [ ] מעבר ל-httpOnly cookies
- [ ] מערכת לוגים מקצועית

---

**נכתב על ידי:** Security Audit  
**תאריך:** 2025-01-07  
**גרסה:** 1.0
