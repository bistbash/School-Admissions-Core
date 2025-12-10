# School Admissions Core - מערכת ניהול בית ספר

מערכת מלאה ומקצועית לניהול תלמידים, מחזורים, מגמות, כיתות וכל משאבי בית הספר, עם מערכת הרשאות מתקדמת ואבטחה ברמה ארגונית.

---

## 📋 תוכן עניינים

- [🚀 התחלה מהירה](#-התחלה-מהירה)
- [סקירה כללית](#סקירה-כללית)
- [תכונות עיקריות](#תכונות-עיקריות)
- [התקנה והפעלה (למתכנתים)](#התקנה-והפעלה-למתכנתים)
- [מדריך למשתמש](#מדריך-למשתמש)
- [מערכת הרשאות](#מערכת-הרשאות)
- [מערכת אבטחה](#מערכת-אבטחה)
- [API Documentation](#api-documentation)
- [מבנה הפרויקט](#מבנה-הפרויקט)

---

## 🚀 התחלה מהירה

### דרישות מערכת
- **Node.js** 18+ 
- **npm** או **yarn**

### שלב 1: הגדרת Backend

```bash
# כניסה לתיקיית backend
cd backend

# התקנת dependencies (אם עדיין לא הותקנו)
npm install

# בדיקה שיש קובץ .env עם JWT_SECRET
# אם אין - צור קובץ .env עם:
# JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

**יצירת JWT_SECRET (אם צריך):**
```bash
openssl rand -base64 32
# העתק את התוצאה ל-.env:
# JWT_SECRET=your-generated-secret-here
```

```bash
# הרצת migrations (יוצר את ה-database)
npx prisma migrate dev

# יצירת משתמש אדמין ראשוני
npm run seed
```

**✅ משתמש אדמין נוצר:**
- פרטי ההתחברות יוצגו בקונסול לאחר הרצת `npm run seed`
- דוגמה לפרטי התחברות (ברירת מחדל אם לא הוגדרו ב-`.env`):
  - Email: `admin@school.local`
  - Password: `Admin123!@#`
- ניתן להתאים את פרטי האדמין דרך environment variables (ראה למטה)
- ⚠️ **חשוב:** שנה את הסיסמה לאחר התחברות ראשונה!

```bash
# הפעלת שרת Backend
npm run dev
```

השרת רץ על `http://localhost:3000`

### שלב 2: הגדרת Frontend

**בטרמינל חדש:**

```bash
# כניסה לתיקיית frontend
cd frontend

# התקנת dependencies
npm install

# הפעלת שרת Frontend
npm run dev
```

הפרונטאנד רץ על `http://localhost:5173`

### שלב 3: התחברות למערכת

1. פתח דפדפן וגש ל-`http://localhost:5173`
2. התחבר עם פרטי האדמין שנוצרו ב-seed
   - אם לא הוגדרו ב-`.env`, השתמש בערכי ברירת מחדל (יוצגו בקונסול)
   - דוגמה: Email: `admin@school.local`, Password: `Admin123!@#`
3. שנה את הסיסמה מיד לאחר התחברות ראשונה

### ✅ הכל מוכן!

המערכת פועלת ומוכנה לשימוש. לפרטים נוספים, ראה את [התקנה והפעלה (למתכנתים)](#התקנה-והפעלה-למתכנתים).

---

## סקירה כללית

מערכת **School Admissions Core** היא מערכת ניהול מקיפה המיועדת לבתי ספר, המספקת:

- **ניהול תלמידים מלא** - רישום, עדכון, מעקב אחר מחזורים, מגמות וכיתות
- **מערכת הרשאות מתקדמת** - Page-based permissions עם תמיכה ב-view/edit modes
- **אבטחה ברמה ארגונית** - JWT authentication, API Keys, SOC logging, IP blocking
- **מרכז אבטחה (SOC)** - ניטור, ניתוח, וניהול אירועי אבטחה
- **API מקצועי** - RESTful API מלא עם תיעוד דינמי
- **ממשק משתמש מודרני** - React 19 עם Tailwind CSS, תמיכה מלאה בעברית (RTL)

---

## תכונות עיקריות

### 🎓 ניהול תלמידים
- רישום ועדכון תלמידים
- העלאה מאקסל (ממחשוב)
- ניהול מחזורים (cohorts) - נוצרים אוטומטית מ-1973 עד השנה הנוכחית + 1
- ניהול מגמות (tracks)
- ניהול כיתות (classes)
- מעקב אחר יציאות תלמידים

### 🔐 מערכת הרשאות מתקדמת
- **Page-based permissions** - הרשאות ברמת דף (view/edit)
- **אוטומטיות** - קבלת הרשאת דף מעניקה אוטומטית הרשאות ל-API endpoints הקשורים
- **Roles & Users** - הרשאות דרך תפקידים או ישירות למשתמש
- **Admin override** - מנהלי מערכת מקבלים גישה מלאה
- **Mode switching** - צפייה/עריכה אוטומטית לפי הרשאות

### 🔒 אבטחה
- **JWT Authentication** - אימות מאובטח עם tokens
- **API Keys** - אימות דרך API keys לתכנות
- **SOC Logging** - כל פעולה נרשמת למרכז אבטחה
- **IP Blocking** - חסימת כתובות IP זדוניות
- **Rate Limiting** - הגבלת קצב בקשות
- **CSRF Protection** - הגנה מפני CSRF attacks
- **Audit Trail** - מעקב מלא אחר כל הפעולות במערכת

### 📊 מרכז אבטחה (SOC)
- צפייה בלוגי ביקורת מלאים
- ניטור אירועי אבטחה
- סטטיסטיקות ומטריקות
- ניהול תקריות אבטחה
- ייצוא נתונים לניתוח

### 🔑 API Keys
- יצירת מפתחות API מאובטחים
- ניהול מפתחות (צפייה, מחיקה)
- הרשאות מבוססות על משתמש
- מעקב אחר שימוש

### 👥 ניהול משאבים
- ניהול משתמשים
- ניהול מחלקות ותפקידים
- ניהול חדרים
- ניהול הרשאות מתקדם

---

## התקנה והפעלה (למתכנתים)

> 💡 **טיפ:** אם זו הפעם הראשונה שלך, עקוב אחר [התחלה מהירה](#-התחלה-מהירה) למעלה.

### דרישות מערכת
- **Node.js** 18+ 
- **npm** או **yarn**
- **Git**

### Backend Setup

#### 1. התקנת Dependencies

```bash
cd backend
npm install
```

#### 2. הגדרת Environment Variables

צור קובץ `.env` בתיקיית `backend` (או העתק מ-`.env.example` אם קיים):

```bash
# אם יש .env.example:
cp .env.example .env

# אחרת, צור קובץ .env חדש
```

**חשוב מאוד**: הוסף `JWT_SECRET` חזק לקובץ `.env`:

```bash
# יצירת secret חזק:
openssl rand -base64 32

# הוספה ל-.env:
JWT_SECRET=your-generated-secret-here
```

**Environment Variables זמינים:**
- `JWT_SECRET` (חובה) - מפתח להצפנת JWT tokens (מינימום 32 תווים)
- `PORT` (אופציונלי) - פורט השרת (ברירת מחדל: 3000)
- `NODE_ENV` (אופציונלי) - סביבה (development/production/test)
- `DATABASE_URL` (אופציונלי) - כתובת database (ברירת מחדל: SQLite)
- `FRONTEND_URL` (אופציונלי) - כתובת Frontend ל-CORS
- `AUTO_SEED` (אופציונלי) - זריעה אוטומטית אם database ריק (true/false)

**התאמה אישית ל-Seed:**
- `ADMIN_EMAIL` - אימייל אדמין (ברירת מחדל: `admin@school.local`)
- `ADMIN_PASSWORD` - סיסמת אדמין (ברירת מחדל: `Admin123!@#`)
- `ADMIN_NAME` - שם אדמין (ברירת מחדל: `System Administrator`)
- `DEFAULT_DEPARTMENT_NAME` - שם מחלקה (אופציונלי)
- `DEFAULT_ROLE_NAME` - שם תפקיד (אופציונלי)

**⚠️ אבטחה:** אם לא הגדרת `ADMIN_EMAIL` ו-`ADMIN_PASSWORD` ב-`.env`, המערכת תשתמש בערכי ברירת מחדל. פרטי ההתחברות יוצגו בקונסול לאחר הרצת `npm run seed`.

#### 3. הגדרת Database

```bash
# הרצת migrations (יוצר את ה-database)
npx prisma migrate dev

# יצירת Prisma Client
npx prisma generate
```

#### 4. זריעת Database (יצירת נתונים ראשוניים)

```bash
# יצירת משתמש אדמין ראשוני
npm run seed
```

זה יוצר:
- ✅ משתמש אדמין (ברירת מחדל: `admin@school.local` / `Admin123!@#` - אם לא הוגדרו ב-`.env`)
- ✅ כל ההרשאות במערכת (95 הרשאות)
- ✅ משתמש אדמין נוסף ל-Trusted Users Whitelist

**פרטי התחברות:** לאחר הרצת `npm run seed`, פרטי האדמין (אימייל וסיסמה) יוצגו בקונסול. שמור אותם במקום בטוח!

**⚠️ חשוב**: שנה את הסיסמה של האדמין לאחר התחברות ראשונה!

#### 5. הפעלת שרת פיתוח

```bash
npm run dev
```

השרת רץ על `http://localhost:3000`

**Auto-seeding**: אם הגדרת `AUTO_SEED=true` ב-`.env`, השרת יזרע את ה-database אוטומטית בעת הפעלה אם הוא ריק (פיתוח בלבד).

### Frontend Setup

#### 1. התקנת Dependencies

```bash
cd frontend
npm install
```

#### 2. הגדרת Environment Variables (אופציונלי)

צור קובץ `.env` בתיקיית `frontend` (או העתק מ-`.env.example` אם קיים):

```bash
# אם יש .env.example:
cp .env.example .env

# אחרת, צור קובץ .env חדש עם:
VITE_API_URL=http://localhost:3000/api
```

**Environment Variables זמינים:**
- `VITE_API_URL` - כתובת ה-API (ברירת מחדל: `http://localhost:3000/api`)

#### 3. הפעלת שרת פיתוח

```bash
npm run dev
```

הפרונטאנד רץ על `http://localhost:5173`

### הפעלה מלאה

**צריך 2 טרמינלים:**

**טרמינל 1 - Backend:**
```bash
cd backend
npm run dev
```

**טרמינל 2 - Frontend:**
```bash
cd frontend
npm run dev
```

אז פתח דפדפן ב-`http://localhost:5173` והתחבר עם פרטי האדמין.

### Scripts נוספים

**Backend:**
- `npm run build` - Build לייצור
- `npm run start` - הפעלת שרת ייצור
- `npm run seed:force` - זריעה כפויה (גם אם יש נתונים)
- `npm run reset:seed` - איפוס מלא + זריעה
- `npm run seed-permissions` - יצירת הרשאות בלבד
- `npx prisma studio` - פתיחת Prisma Studio לניהול database

**Frontend:**
- `npm run build` - Build לייצור
- `npm run preview` - Preview של build

### פתרון בעיות נפוצות

#### ❌ שגיאה: "Could not find Prisma Schema"
**פתרון:** ודא שאתה רץ את הפקודה מתוך תיקיית `backend`:
```bash
cd backend
npx prisma migrate dev
```

#### ❌ שגיאה: "JWT_SECRET must be at least 32 characters"
**פתרון:** צור JWT_SECRET חזק:
```bash
openssl rand -base64 32
```
העתק את התוצאה לקובץ `.env` בתיקיית `backend`:
```
JWT_SECRET=your-generated-secret-here
```

#### ❌ שגיאה: "Port 3000 already in use"
**פתרון:** שנה את הפורט ב-`.env`:
```
PORT=3001
```
או עצור את התהליך שמשתמש בפורט 3000.

#### ❌ שגיאה: "Database is locked" (SQLite)
**פתרון:** זה קורה כשיש מספר תהליכים שמנסים לגשת ל-database. ודא שיש רק instance אחד של השרת רץ.

#### ❌ Frontend לא מתחבר ל-Backend
**פתרון:** 
1. ודא שה-Backend רץ על `http://localhost:3000`
2. בדוק את `VITE_API_URL` ב-`.env` של Frontend:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```
3. הפעל מחדש את שרת ה-Frontend

#### ❌ "Cannot find module" או שגיאות dependencies
**פתרון:** התקן מחדש את ה-dependencies:
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### ❌ Database לא נוצר או migrations נכשלו
**פתרון:** 
1. מחק את ה-database הקיים (אם יש):
   ```bash
   cd backend
   rm -f prisma/dev.db
   ```
2. הרץ migrations מחדש:
   ```bash
   npx prisma migrate dev
   ```

#### ❌ שכחתי את סיסמת האדמין
**פתרון:** איפוס database וזריעה מחדש:
```bash
cd backend
npm run reset:seed
```
⚠️ **אזהרה:** זה ימחק את כל הנתונים!

---

## מדריך למשתמש

### התחברות ראשונה

1. התחבר עם פרטי האדמין שנוצרו ב-seed
2. אם זה משתמש חדש - תצטרך להשלים פרופיל (מספר אישי, שם, מחלקה, תפקיד)
3. חכה לאישור מנהל מערכת (אם אינך אדמין)

### ניהול תלמידים

**הוספת תלמיד חדש:**
1. עבור לדף "תלמידים"
2. לחץ על "הוסף תלמיד"
3. מלא את הפרטים הנדרשים
4. בחר מחזור (cohort) - המחזורים נוצרים אוטומטית מ-1973

**העלאת תלמידים מאקסל:**
1. לחץ על "העלאת אקסל ממשו"ב"
2. בחר קובץ אקסל בפורמט הנדרש
3. המערכת תזהה ותייבא את כל התלמידים

**ניהול מחזורים:**
- המחזורים נוצרים אוטומטית מ-1973 עד השנה הנוכחית + 1
- כל מחזור מתעדכן אוטומטית עם הכיתה הנוכחית שלו
- ב-1 בספטמבר כל המחזורים עולים כיתה אוטומטית

### ניהול הרשאות

**מתן הרשאה למשתמש:**
1. עבור ל"ניהול משאבים"
2. בחר משתמש או תפקיד
3. לחץ על "נהל הרשאות"
4. בחר דף והפעל "צפייה" או "עריכה"
5. המערכת תעניק אוטומטית את כל ה-API permissions הקשורים

**מה קורה כשנותנים הרשאה:**
- מתן הרשאת **צפייה** → מעניק גישה לכל ה-view APIs של הדף
- מתן הרשאת **עריכה** → מעניק גישה לכל ה-view + edit APIs של הדף

### יצירת API Key

**רק משתמשים עם הרשאת עריכה לדף "מפתחות API" יכולים ליצור מפתחות:**
1. עבור לדף "מפתחות API"
2. אם יש לך הרשאה - תראה טופס ליצירת מפתח
3. אם אין לך הרשאה - תראה הודעה איך לקבל הרשאה
4. מלא שם למפתח ובחר תאריך תפוגה (אופציונלי)
5. **חשוב**: שמור את המפתח מיד - הוא מוצג פעם אחת בלבד!

### מרכז אבטחה (SOC)

**צפייה בלוגים:**
1. עבור ל"מרכז אבטחה"
2. צפה בלוגי ביקורת, סטטיסטיקות, ואירועי אבטחה
3. סנן לפי תאריך, משתמש, פעולה, ועוד

**ניהול תקריות:**
- אם יש לך הרשאת עריכה → תוכל לעדכן סטטוס תקריות
- סמן תקריות כ-NEW, INVESTIGATING, RESOLVED, וכו'

---

## מערכת הרשאות

### מושגי יסוד

#### Pages (דפים)
כל דף במערכת יש לו הרשאות משלו:
- **Dashboard** - לוח בקרה
- **Students** - ניהול תלמידים
- **Resources** - ניהול משאבים (משתמשים, מחלקות, תפקידים)
- **SOC** - מרכז אבטחה
- **API Keys** - מפתחות API
- **Tracks** - ניהול מגמות
- **Cohorts** - ניהול מחזורים
- **Classes** - ניהול כיתות
- **Student Exits** - יציאות תלמידים
- **Settings** - הגדרות

#### View vs Edit
- **View (צפייה)** - גישה לקריאה בלבד (GET requests)
- **Edit (עריכה)** - גישה לקריאה + כתיבה (GET, POST, PUT, DELETE)

#### מקורות הרשאות
1. **Role Permissions** - הרשאות דרך תפקיד (כל המשתמשים עם התפקיד מקבלים)
2. **User Permissions** - הרשאות ישירות למשתמש
3. **Admin Override** - מנהלי מערכת מקבלים גישה מלאה אוטומטית

### איך זה עובד?

**Backend - אימות הרשאות:**

כל API endpoint מוגן ע"י middleware שמבצע:

1. **Authentication** - האם המשתמש מזוהה? (JWT או API Key)
2. **Admin Check** - האם המשתמש הוא admin? → גישה מלאה
3. **Policy Checks** - בדיקות מדיניות מיוחדות:
   - Profile completion endpoints (למשתמשים CREATED/PENDING)
   - Public reference data (למשתמשים APPROVED - roles, departments)
   - Self-access endpoints (למשתמשים APPROVED - my-permissions, auth/me)
4. **Page Permission Check** - האם יש הרשאת דף?
   - `page:students:view` → גישה ל-view APIs של students
   - `page:students:edit` → גישה ל-view + edit APIs של students
5. **Direct Permission Check** - האם יש הרשאה ישירה?
   - `students:read`, `students:create`, וכו'

אם כל הבדיקות נכשלות → `403 Forbidden`

**Frontend - הגנה על Routes:**

- `PermissionGuard` מגן על routes לפי הרשאות
- אם אין הרשאה → מעבר לדף 403
- תוכן מותאם אוטומטית לפי הרשאות (הצגת/הסתרת כפתורים, וכו')

### דוגמאות הרשאות

**משתמש עם `students:view`:**
- ✅ יכול לראות רשימת תלמידים
- ✅ יכול לראות פרטי תלמיד ספציפי
- ❌ לא יכול ליצור/לעדכן/למחוק תלמידים

**משתמש עם `students:edit`:**
- ✅ כל מה ש-view יכול
- ✅ יכול ליצור תלמידים חדשים
- ✅ יכול לעדכן תלמידים קיימים
- ✅ יכול למחוק תלמידים
- ✅ יכול לנהל מגמות (כי זה חלק מעריכת תלמידים)

**Admin:**
- ✅ גישה מלאה לכל דבר במערכת

---

## מערכת אבטחה

### אימות (Authentication)

**שתי דרכים להתחבר:**

1. **JWT Token** - התחברות רגילה
   ```
   Authorization: Bearer <token>
   ```

2. **API Key** - לתכנות אוטומטי
   ```
   x-api-key: sk_...
   ```

**כיצד זה עובד:**
- כל בקשה עוברת דרך `authenticate` middleware
- אם אין token/API key → `401 Unauthorized`
- אם ה-token/API key לא תקין → `401 Unauthorized`

### הרשאות (Authorization)

**כל endpoint מוגן:**
- ✅ דורש authentication (מפתח)
- ✅ בודק permissions לפני ביצוע
- ✅ נרשם ל-SOC logs

**סדר הבדיקות:**
1. Admin check → אם admin → גישה מלאה
2. Policy checks → מדיניות מיוחדות
3. Page permissions → בדיקה לפי דף
4. Direct permissions → בדיקה ישירה
5. אם הכל נכשל → `403 Forbidden`

### SOC Logging (רישום פעילות)

**כל פעולה נרשמת:**
- ✅ מי ביצע את הפעולה (userId, apiKeyId)
- ✅ מה בוצע (action, resource)
- ✅ מתי (timestamp)
- ✅ איך (HTTP method, path)
- ✅ תוצאה (SUCCESS/FAILURE)
- ✅ פרטים נוספים (IP, user agent, response time, וכו')

**מה נרשם:**
- התחברויות (מוצלחות וכשלונות)
- פעולות CRUD (יצירה, עדכון, מחיקה)
- ניסיונות גישה לא מורשים
- שימוש ב-API Keys
- עדכוני הרשאות

### IP Blocking

**חסימת כתובות IP זדוניות:**
- המערכת חוסמת IPs לאחר מספר ניסיונות כושלים
- ניתן לחסום/לבטל חסימה ידנית
- כל חסימה נרשמת ל-SOC

### API Keys - אבטחה

**כיצד API Keys מאובטחים:**
- כל key מאוחסן כ-hash (SHA-256) - המפתח המקורי לא נשמר
- ניתן להגדיר תאריך תפוגה
- ניתן לבטל (revoke) מפתחות
- כל שימוש נרשם עם `apiKeyId` ל-SOC
- **הרשאות מבוססות משתמש** - ה-API key יורש את ההרשאות של המשתמש שיצר אותו

**בדיקת הרשאות עבור API Key:**
- אם המשתמש הוא admin → ה-API key מקבל גישה מלאה
- אחרת → ה-API key נבדק מול permissions של המשתמש

---

## API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
התחברות למשתמש קיים

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "שם משתמש",
    "isAdmin": false
  }
}
```

#### `POST /api/auth/register`
רישום משתמש חדש (אם מופעל)

#### `GET /api/auth/me`
קבלת פרטי המשתמש הנוכחי (מוגן)

#### `POST /api/auth/complete-profile`
השלמת פרופיל (למשתמשים CREATED/PENDING)

### Students Endpoints

#### `GET /api/students`
רשימת כל התלמידים

**Query Parameters:**
- `status` - סטטוס (ACTIVE, GRADUATED, LEFT, ARCHIVED)
- `cohortId` - סינון לפי מחזור
- `track` - סינון לפי מגמה

**דורש:** `students:read` או `page:students:view`

#### `GET /api/students/:id`
פרטי תלמיד ספציפי

**דורש:** `students:read` או `page:students:view`

#### `POST /api/students`
יצירת תלמיד חדש

**Request:**
```json
{
  "idNumber": "123456789",
  "firstName": "יוסי",
  "lastName": "כהן",
  "gender": "MALE",
  "cohortId": 1,
  "studyStartDate": "2024-09-01T00:00:00Z"
}
```

**דורש:** `students:create` או `page:students:edit`

#### `PUT /api/students/:id`
עדכון תלמיד

**דורש:** `students:update` או `page:students:edit`

#### `DELETE /api/students/:id`
מחיקת תלמיד

**דורש:** `students:delete` או `page:students:edit`

#### `POST /api/students/upload`
העלאת תלמידים מאקסל

**Content-Type:** `multipart/form-data`

**דורש:** `students:create` או `page:students:edit`

### Cohorts Endpoints

#### `GET /api/cohorts`
רשימת כל המחזורים

**הערה:** המחזורים נוצרים אוטומטית מ-1973 עד השנה הנוכחית + 1

**Query Parameters:**
- `isActive` - סינון לפי סטטוס פעיל (true/false)
- `skipAutoCreate` - דילוג על יצירה אוטומטית (default: false)
- `forceRefresh` - כפיית עדכון (דילוג על cache, default: false)

**דורש:** `cohorts:read` או `page:cohorts:view` או `page:students:view`

#### `GET /api/cohorts/:id`
פרטי מחזור ספציפי

**דורש:** `cohorts:read` או `page:cohorts:view` או `page:students:view`

#### `POST /api/cohorts/refresh`
רענון כל המחזורים (עדכון כיתות וסטטוס)

**דורש:** `cohorts:update` או `page:cohorts:edit`

### Tracks Endpoints

#### `GET /api/tracks`
רשימת כל המגמות

**דורש:** `tracks:read` או `page:tracks:view` או `page:students:view`

#### `POST /api/tracks`
יצירת מגמה חדשה

**דורש:** `tracks:create` או `page:tracks:edit` או `page:students:edit`

### API Keys Endpoints

#### `POST /api/api-keys`
יצירת מפתח API חדש

**Request:**
```json
{
  "name": "My API Key",
  "expiresAt": "2026-12-31T23:59:59Z" // אופציונלי
}
```

**Response:**
```json
{
  "message": "API key created successfully...",
  "apiKey": {
    "id": 1,
    "key": "sk_c036029d9e2ed0d632719f066b5ccb7597c4f0c35e568441ea1be663b3e08af5",
    "name": "My API Key",
    "createdAt": "2025-12-09T09:31:15Z",
    "expiresAt": null
  },
  "warning": "This is the only time you will see this key..."
}
```

**דורש:** `api-keys:create` או `page:api-keys:edit`

**חשוב:** המפתח המקורי מוצג פעם אחת בלבד! שמור אותו מיד.

#### `GET /api/api-keys`
רשימת מפתחות API של המשתמש

**דורש:** `api-keys:read` או `page:api-keys:view`

#### `DELETE /api/api-keys/:id`
ביטול מפתח API

**דורש:** `api-keys:delete` או `page:api-keys:edit`

### SOC Endpoints

#### `GET /api/soc/audit-logs`
לוגי ביקורת

**Query Parameters:**
- `userId` - סינון לפי משתמש
- `action` - סינון לפי פעולה
- `resource` - סינון לפי משאב
- `status` - סינון לפי סטטוס (SUCCESS/FAILURE)
- `startDate`, `endDate` - טווח תאריכים
- `limit`, `offset` - pagination

**דורש:** `soc:read` או `page:soc:view`

#### `GET /api/soc/stats`
סטטיסטיקות אבטחה

**דורש:** `soc:read` או `page:soc:view`

#### `PUT /api/soc/incidents/:id`
עדכון אירוע אבטחה

**דורש:** `soc:update` או `page:soc:edit`

---

## מבנה הפרויקט

```
School-Admissions-Core/
├── backend/                      # Backend API
│   ├── src/
│   │   ├── lib/                  # ספריות משותפות
│   │   │   ├── auth/             # אימות (JWT, API Keys)
│   │   │   ├── permissions/      # מערכת הרשאות
│   │   │   ├── audit/            # רישום פעילות
│   │   │   ├── security/         # אבטחה (IP blocking, rate limiting)
│   │   │   └── database/         # Prisma client
│   │   ├── modules/              # מודולים לפי תכונה
│   │   │   ├── students/         # ניהול תלמידים
│   │   │   ├── cohorts/          # ניהול מחזורים
│   │   │   ├── tracks/           # ניהול מגמות
│   │   │   ├── api-keys/         # מפתחות API
│   │   │   ├── soc/              # מרכז אבטחה
│   │   │   └── permissions/      # ניהול הרשאות
│   │   └── server.ts             # הגדרת שרת Express
│   └── prisma/
│       └── schema.prisma         # סכמת database
│
├── frontend/                     # Frontend React
│   ├── src/
│   │   ├── features/             # תכונות לפי עמוד
│   │   │   ├── students/         # ניהול תלמידים
│   │   │   ├── permissions/      # ניהול הרשאות
│   │   │   └── api/              # מפתחות API ותיעוד
│   │   ├── shared/               # קומפוננטים משותפים
│   │   │   ├── components/       # Layout, UI components
│   │   │   └── lib/              # API client, utilities
│   │   └── App.tsx               # נקודת כניסה
│
└── docs/                         # תיעוד מקיף
    ├── security/                 # תיעוד אבטחה
    ├── features/                 # תיעוד תכונות
    ├── guides/                   # מדריכים
    └── improvements/             # שיפורים שבוצעו
```

---

## פרטים טכניים למתכנתים

### Tech Stack

**Backend:**
- Node.js + Express 5
- TypeScript
- Prisma ORM (SQLite)
- Zod (validation)
- JWT + bcrypt (authentication)
- Pino (logging)

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

### Database Schema

**Models עיקריים:**
- `Soldier` - משתמשים/עובדים
- `Student` - תלמידים
- `Cohort` - מחזורים (נוצרים אוטומטית מ-1973)
- `Class` - כיתות
- `Track` - מגמות
- `Permission` - הרשאות
- `UserPermission` - הרשאות משתמש
- `RolePermission` - הרשאות תפקיד
- `ApiKey` - מפתחות API
- `AuditLog` - לוגי פעילות

### Permission System Architecture

**Backend:**
- `permission-registry.ts` - רשימה מרכזית של כל ה-pages וה-APIs
- `permissions.ts` - לוגיקה לבדיקת הרשאות
- `api-permission-middleware.ts` - middleware הגנת API endpoints
- `permission-policies.ts` - מדיניות מיוחדות (admin, profile completion, וכו')

**Frontend:**
- `PermissionsContext.tsx` - context לבדיקת הרשאות
- `PermissionGuard.tsx` - הגנה על routes
- `PageModeContext.tsx` - ניהול מצב view/edit

### Cohort Management

**יצירה אוטומטית:**
- מחזורים נוצרים אוטומטית בעת הפעלת השרת
- מחזורים נוצרים/מתעדכנים בכל קריאה ל-`GET /api/cohorts` (עם cache של שעה)
- כל מחזור מתעדכן אוטומטית עם הכיתה הנוכחית ב-1 בספטמבר

**Cache:**
- משתמש ב-static cache (משותף בין כל instances)
- Cooldown של שעה (מונע הרצה על כל קריאת API)
- ניתן לעקוף עם `forceRefresh=true`

---

## כללי אבטחה למשתמשים

1. **שמור על הסיסמה חזקה** - שים סיסמה עם לפחות 8 תווים, אותיות, מספרים וסימנים
2. **שנה את סיסמת האדמין** - לאחר התחברות ראשונה, שנה את הסיסמה
3. **API Keys** - שמור מפתחות API במקום בטוח, לעולם אל תשתף אותם
4. **הרשאות** - תן רק את ההרשאות הנדרשות למשתמשים
5. **מעקב** - בדוק את SOC logs באופן קבוע לזיהוי פעילות חשודה

---

## תמיכה וסיוע

לשאלות טכניות או בעיות:
1. בדוק את התיעוד ב-`docs/`
2. בדוק את ה-SOC logs לאירועי אבטחה
3. פנה למנהל המערכת

---

## רישיון

ISC

---

**גרסה:** 1.0.0  
**עודכן לאחרונה:** 2025-12-09
