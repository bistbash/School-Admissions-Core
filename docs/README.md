# Documentation

תיעוד מקיף למערכת School Admissions Core.

---

## 📚 תיעוד למתכנתים

### 🔐 [Permissions & Security Guide](./PERMISSIONS_AND_SECURITY_GUIDE.md)
**מדריך מקיף על הרשאות ואבטחה** - כל מה שצריך לדעת:
- איך הרשאות עובדות (מבחינה טכנית)
- איך מאבטחים את האתר (כל שכבות האבטחה)
- איך בונים הרשאות חדשות (מדריך מעשי)
- דוגמאות מעשיות
- Best Practices
- Troubleshooting

### 📚 [Grades, Cohorts & Classes Guide](./GRADES_COHORTS_CLASSES_GUIDE.md)
**מדריך מקיף על שכבות, מחזורים, כיתות ותאריכים** - איך המערכת עובדת:
- שכבות גיל (ט', י', י"א, י"ב)
- מחזורים (Cohorts) - חישוב כיתה נוכחית
- כיתות (Classes) - שנות לימודים ו-academicYear
- תאריכים - studyStartDate, enrollmentDate, 1 בספטמבר
- איך הכל מתחבר יחד
- חישובים אוטומטיים
- דוגמאות מעשיות

### 🏗️ [Architecture Guide](./ARCHITECTURE.md)
**מדריך ארכיטקטורה מקיף** - הבנת המבנה הכללי של המערכת:
- ארכיטקטורה כללית
- מבנה Backend
- מבנה Frontend
- מערכת הרשאות
- מערכת אבטחה
- Database Schema
- תקשורת בזמן אמת

### 💻 [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
**מדריך פיתוח Backend** - כל מה שצריך לדעת לפיתוח Backend:
- התחלה מהירה
- יצירת מודול חדש
- API Development
- Database Operations
- Authentication & Authorization
- Error Handling & Logging
- Best Practices

### 🎨 [Frontend Development Guide](./FRONTEND_DEVELOPMENT.md)
**מדריך פיתוח Frontend** - כל מה שצריך לדעת לפיתוח Frontend:
- התחלה מהירה
- יצירת Feature חדש
- Components & State Management
- Routing & API Integration
- Permissions
- Styling עם Tailwind CSS
- Best Practices

### 🗄️ [Database Guide](./DATABASE_GUIDE.md)
**מדריך Database** - עבודה עם Prisma ו-Database:
- Database Schema
- Migrations
- Seeding
- Prisma Client
- Queries & Relations
- Transactions
- Best Practices

### 📡 [API Reference](./API_REFERENCE.md)
**תיעוד API מקיף** - כל ה-endpoints במערכת:
- Authentication
- Students API
- Cohorts API
- Tracks & Classes
- Permissions API
- SOC API
- API Keys
- Search API

### 🔄 [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
**מדריך Workflow פיתוח** - תהליך העבודה היומיומי:
- Setup ראשוני
- Workflow יומי
- יצירת Feature חדש
- Git Workflow
- Testing & Code Review
- Deployment
- Troubleshooting

---

## 📁 מבנה התיעוד

### 🔒 [Security](./security/)
תיעוד אבטחה מקיף:
- **SECURITY.md** - סקירה כללית של אמצעי אבטחה
- **SECURITY_ASSESSMENT.md** - הערכת אבטחה מפורטת
- **SECURITY_AUDIT_REPORT.md** - דוח ביקורת אבטחה
- **SECURITY_IMPROVEMENTS.md** - שיפורי אבטחה שבוצעו
- **SECURITY_IMPROVEMENTS_SUMMARY.md** - סיכום שיפורי אבטחה
- **API_KEYS_SECURITY.md** - אבטחת מפתחות API
- **TRUSTED_USERS_WHITELIST.md** - מערכת משתמשים מהימנים

### ⚙️ [Features](./features/)
תיעוד תכונות המערכת:
- **ADMIN_SYSTEM.md** - מערכת ניהול מנהלים
- **PERMISSIONS_SYSTEM.md** - מערכת הרשאות (English)
- **COHORTS_API.md** - API למחזורים
- **AUDIT_LOGGING.md** - מערכת לוגים ואבטחה

### 📖 [Guides](./guides/)
מדריכים והנחיות:
- **HOW_TO_CHECK_ADMIN.md** - איך לבדוק אם משתמש הוא admin
- **LARGE_FILE_UPLOADS.md** - העלאת קבצים גדולים
- **RATE_LIMITING_EXPLAINED.md** - הסבר על rate limiting
- **UNBLOCK_IP_GUIDE.md** - איך לבטל חסימת IP
- **DATABASE_SEEDING.md** - מדריך seeding

### 🚀 [Improvements](./improvements/)
תיעוד שיפורים שבוצעו:
- **BACKEND_IMPROVEMENTS.md** - שיפורי backend
- **PRODUCTION_IMPROVEMENTS.md** - שיפורים לפרודקשן
- **SOC_IMPROVEMENTS.md** - שיפורי SOC (Security Operations Center)

### 🖥️ [Deployment](./deployment/)
תיעוד פריסה:
- **PHYSICAL_SERVER_DEPLOYMENT.md** - מדריך פריסה על שרת פיזי

---

## 📚 תיעוד ראשי

- **[README.md](../README.md)** - תיעוד ראשי של הפרויקט
- **[backend/README.md](../backend/README.md)** - תיעוד backend
- **[frontend/README.md](../frontend/README.md)** - תיעוד frontend

---

## 🔍 איך למצוא מה שאתה מחפש?

### מתכנת חדש?
→ התחל עם [Architecture Guide](./ARCHITECTURE.md) ואז [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

### צריך להבין איך הרשאות ואבטחה עובדות?
→ עיין ב-[Permissions & Security Guide](./PERMISSIONS_AND_SECURITY_GUIDE.md)

### צריך להבין איך שכבות, מחזורים וכיתות עובדות?
→ עיין ב-[Grades, Cohorts & Classes Guide](./GRADES_COHORTS_CLASSES_GUIDE.md)

### מפתח Backend?
→ עיין ב-[Backend Development Guide](./BACKEND_DEVELOPMENT.md) ו-[Database Guide](./DATABASE_GUIDE.md)

### מפתח Frontend?
→ עיין ב-[Frontend Development Guide](./FRONTEND_DEVELOPMENT.md)

### צריך מידע על API?
→ עיין ב-[API Reference](./API_REFERENCE.md)

### מחפש מידע על אבטחה?
→ עיין ב-[Security](./security/)

### מחפש מידע על תכונה ספציפית?
→ עיין ב-[Features](./features/)

### צריך מדריך לשימוש?
→ עיין ב-[Guides](./guides/)

### רוצה לדעת מה שופר?
→ עיין ב-[Improvements](./improvements/)

### צריך לפרוס את המערכת?
→ עיין ב-[Deployment](./deployment/)

---

## 📋 תיעוד נוסף

### מערכת הרשאות
- **[PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)** - מדריך מקיף בעברית
- **[PERMISSIONS_OPTIMIZATION.md](./PERMISSIONS_OPTIMIZATION.md)** - ייעול ניהול הרשאות
- **[features/PERMISSIONS_SYSTEM.md](./features/PERMISSIONS_SYSTEM.md)** - Enterprise Permissions System (English)

### SOC (Security Operations Center)
- **[SOC_BEST_PRACTICES.md](./SOC_BEST_PRACTICES.md)** - Best practices ל-SOC
- **[SOC_IMPROVEMENTS_RECOMMENDATIONS.md](./SOC_IMPROVEMENTS_RECOMMENDATIONS.md)** - המלצות לשיפור SOC

### יצירת דפים
- **[PAGE_CREATION_GUIDE.md](./PAGE_CREATION_GUIDE.md)** - מדריך יצירת דפים חדשים
