# Database Seeding Guide

מדריך זה מסביר כיצד להשתמש ב-Database Seed Script ליצירת משתמש אדמין ראשוני ומבנה בסיסי של המערכת.

## מה זה Database Seeding?

Database Seeding הוא תהליך של יצירת נתונים ראשוניים במערכת כאשר ה-database ריק. זה מאפשר לך להתחיל לעבוד עם המערכת מיד לאחר התקנה, ללא צורך ליצור משתמש אדמין ידנית.

## מה נוצר ב-Seed?

כאשר אתה מריץ את ה-seed script, המערכת יוצרת:

1. **משתמש אדמין ראשוני** - עם גישה מלאה לכל המערכת
2. **מחלקה ותפקיד (אופציונלי)** - רק אם הגדרת `DEFAULT_DEPARTMENT_NAME` ו-`DEFAULT_ROLE_NAME` ב-`.env`
3. **כל ההרשאות** - כל הרשאות הדפים וה-API endpoints
4. **Trusted User** - המשתמש האדמין מתווסף לרשימת משתמשים מהימנים

**הערה**: המחלקה והתפקיד הם אופציונליים - האדמין יכול להוסיף אותם מאוחר יותר דרך המערכת.

## איך להשתמש?

### שיטה 1: Reset + Seed (מומלץ להתחלה חדשה)

```bash
npm run reset:seed
```

פקודה זו:
- **מאפסת את כל ה-database** (מוחקת את כל הנתונים!)
- מריצה migrations מחדש
- יוצרת את כל הנתונים הראשוניים עם ההגדרות מה-`.env`
- **שימושי כאשר אתה רוצה להתחיל מחדש עם database נקי**

⚠️ **אזהרה**: זה ימחק את כל הנתונים הקיימים!

### שיטה 2: Seed רגיל

```bash
npm run seed
```

פקודה זו:
- בודקת אם ה-database ריק
- אם ריק - יוצרת את כל הנתונים הראשוניים
- אם לא ריק - מדלגת על ה-seed (למניעת מחיקת נתונים קיימים)

### שיטה 3: Seed כפוי

```bash
npm run seed:force
```

פקודה זו:
- מתעלמת מנתונים קיימים
- יוצרת/מעדכנת את הנתונים הראשוניים
- **שימושי כאשר אתה רוצה לעדכן את הנתונים הראשוניים**

### שיטה 4: Auto-Seed אוטומטי

אם אתה רוצה שהמערכת תריץ seed אוטומטית כשהשרת מתחיל (רק אם ה-database ריק):

1. הוסף ל-`.env`:
```env
AUTO_SEED=true
```

2. הפעל את השרת:
```bash
npm run dev
```

השרת יבדוק אם ה-database ריק ויריץ seed אוטומטית.

**⚠️ חשוב**: Auto-seed עובד רק ב-development mode (`NODE_ENV !== 'production'`)

## הגדרת משתני סביבה

אתה יכול להתאים אישית את הנתונים שנוצרים ב-seed על ידי הגדרת משתני סביבה ב-`.env`:

### משתמש אדמין

```env
# אימייל של משתמש האדמין
ADMIN_EMAIL=admin@school.local

# סיסמה של משתמש האדמין
# ⚠️ חשוב: שנה את הסיסמה אחרי ההתחברות הראשונה!
ADMIN_PASSWORD=Admin123!@#

# שם של משתמש האדמין
ADMIN_NAME=System Administrator

# מספר אישי של משתמש האדמין
ADMIN_PERSONAL_NUMBER=000000000
```

### מחלקה ותפקיד ברירת מחדל (אופציונלי)

```env
# שם המחלקה הברירת מחדל (אופציונלי)
# אם לא מוגדר, משתמש האדמין ייווצר בלי מחלקה
DEFAULT_DEPARTMENT_NAME=מנהלה

# שם התפקיד הברירת מחדל (אופציונלי)
# אם לא מוגדר, משתמש האדמין ייווצר בלי תפקיד
DEFAULT_ROLE_NAME=מנהל מערכת
```

**הערה**: משתנים אלה הם אופציונליים. אם לא תגדיר אותם, משתמש האדמין ייווצר בלי מחלקה ותפקיד, והוא יוכל להוסיף אותם מאוחר יותר דרך המערכת (יש לו גישה מלאה לכל המערכת).

### Auto-Seed

```env
# הפעל seed אוטומטי כשהשרת מתחיל (development only)
AUTO_SEED=false
```

## ערכי ברירת מחדל

אם לא תגדיר משתני סביבה, המערכת תשתמש בערכים הבאים:

- **Email**: `admin@school.local`
- **Password**: `Admin123!@#`
- **Name**: `System Administrator`
- **Personal Number**: `000000000`
- **Department**: `null` (לא ייווצר - האדמין יכול להוסיף מאוחר יותר)
- **Role**: `null` (לא ייווצר - האדמין יכול להוסיף מאוחר יותר)

## דוגמאות שימוש

### דוגמה 1: Reset + Seed (התחלה חדשה)

```bash
# זה ימחק את כל הנתונים ויצור database חדש עם ההגדרות מה-.env
npm run reset:seed
```

תוצאה:
- כל הנתונים נמחקו
- Database נוצר מחדש
- משתמש אדמין נוצר עם ההגדרות מה-`.env`
- אם הגדרת `DEFAULT_DEPARTMENT_NAME` ו-`DEFAULT_ROLE_NAME` - הם ייווצרו
- אם לא - האדמין ייווצר בלי מחלקה ותפקיד

### דוגמה 2: Seed בסיסי (ללא מחלקה ותפקיד)

```bash
# פשוט הרץ את הפקודה
npm run seed
```

תוצאה:
- משתמש אדמין: `admin@school.local` / `Admin123!@#`
- מחלקה: `null` (לא נוצרה)
- תפקיד: `null` (לא נוצר)

האדמין יכול להוסיף מחלקות ותפקידים מאוחר יותר דרך המערכת.

### דוגמה 2: Seed עם מחלקה ותפקיד

1. צור/עדכן `.env`:
```env
ADMIN_EMAIL=admin@myschool.edu
ADMIN_PASSWORD=MySecurePassword123!
ADMIN_NAME=מנהל המערכת
DEFAULT_DEPARTMENT_NAME=מנהלה כללית
DEFAULT_ROLE_NAME=מנהל ראשי
```

2. הרץ seed:
```bash
npm run seed
```

תוצאה:
- משתמש אדמין: `admin@myschool.edu` / `MySecurePassword123!`
- מחלקה: "מנהלה כללית" (נוצרה)
- תפקיד: "מנהל ראשי" (נוצר)

### דוגמה 4: Seed כפוי (עדכון נתונים קיימים)

```bash
npm run seed:force
```

זה יעדכן את הנתונים הראשוניים גם אם הם כבר קיימים.

## אבטחה

### ⚠️ חשוב מאוד:

1. **שנה את הסיסמה מיד אחרי ההתחברות הראשונה!**
   - הסיסמה הברירת מחדל (`Admin123!@#`) ידועה וצריכה להישנות

2. **אל תשמור סיסמאות ב-`.env` ב-production!**
   - השתמש ב-secrets management system (כמו AWS Secrets Manager, HashiCorp Vault, וכו')

3. **Auto-seed לא עובד ב-production**
   - זה מוגבל רק ל-development mode

## פתרון בעיות

### Seed נכשל עם שגיאה "Database already contains data"

זה אומר שיש כבר נתונים ב-database. אם אתה רוצה לרוץ seed בכל זאת:

```bash
npm run seed:force
```

### Seed לא יוצר משתמש

בדוק:
1. האם ה-database באמת ריק? (`npm run seed:force`)
2. האם יש שגיאות ב-console?
3. האם ה-migrations רצו בהצלחה? (`npx prisma migrate dev`)

### Auto-seed לא עובד

בדוק:
1. האם `AUTO_SEED=true` ב-`.env`?
2. האם `NODE_ENV=development`?
3. האם יש כבר משתמשים ב-database?

## קישורים נוספים

- [Admin System Documentation](../features/ADMIN_SYSTEM.md)
- [Permissions System](../features/PERMISSIONS_SYSTEM.md)
- [Backend Setup Guide](../../README.md#backend-setup)
