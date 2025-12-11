# ארכיטקטורת המערכת - System Architecture

תיעוד מקיף של ארכיטקטורת מערכת School Admissions Core.

---

## סקירה כללית

School Admissions Core היא מערכת ניהול בית ספר מלאה המבוססת על:
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Database**: SQLite (עם אפשרות להחלפה ל-PostgreSQL/MySQL)

---

## ארכיטקטורה כללית

```
┌─────────────────┐
│   Frontend      │  React 19 + Vite
│   (Port 5173)   │  TypeScript + Tailwind
└────────┬────────┘
         │ HTTP/REST API
         │ WebSocket (SOC)
         │
┌────────▼────────┐
│   Backend       │  Express 5 + TypeScript
│   (Port 3000)   │  Prisma ORM
└────────┬────────┘
         │
┌────────▼────────┐
│   Database      │  SQLite
│   (dev.db)      │
└─────────────────┘
```

---

## Backend Architecture

### מבנה תיקיות

```
backend/
├── src/
│   ├── lib/                    # ספריות משותפות
│   │   ├── auth/               # אימות (JWT, API Keys)
│   │   ├── permissions/        # מערכת הרשאות
│   │   ├── audit/              # רישום פעילות
│   │   ├── security/           # אבטחה (IP blocking, rate limiting)
│   │   ├── soc/                # Security Operations Center
│   │   ├── database/           # Prisma client & utilities
│   │   ├── middleware/         # Custom middleware
│   │   └── utils/              # כלי עזר
│   │
│   ├── modules/                 # מודולים לפי תכונה
│   │   ├── auth/                # אימות משתמשים
│   │   ├── students/            # ניהול תלמידים
│   │   ├── cohorts/             # ניהול מחזורים
│   │   ├── tracks/              # ניהול מגמות
│   │   ├── classes/             # ניהול כיתות
│   │   ├── soldiers/            # ניהול משתמשים/עובדים
│   │   ├── permissions/         # ניהול הרשאות
│   │   ├── soc/                 # מרכז אבטחה
│   │   ├── api-keys/            # מפתחות API
│   │   └── search/              # חיפוש
│   │
│   └── server.ts                # נקודת כניסה
│
└── prisma/
    └── schema.prisma            # סכמת database
```

### שכבות ארכיטקטורה

#### 1. Routes Layer
- **תפקיד**: הגדרת endpoints ו-routing
- **מיקום**: `modules/*/routes.ts`
- **אחריות**:
  - הגדרת routes
  - חיבור middleware
  - קישור ל-controllers

#### 2. Controllers Layer
- **תפקיד**: טיפול בבקשות HTTP
- **מיקום**: `modules/*/controller.ts`
- **אחריות**:
  - אימות קלט (validation)
  - קריאה ל-services
  - החזרת תגובות HTTP

#### 3. Services Layer
- **תפקיד**: לוגיקת עסקים
- **מיקום**: `modules/*/service.ts`
- **אחריות**:
  - לוגיקה עסקית
  - גישה ל-database
  - עיבוד נתונים

#### 4. Database Layer
- **תפקיד**: גישה ל-database
- **מיקום**: `lib/database/prisma.ts`
- **כלי**: Prisma ORM

---

## Frontend Architecture

### מבנה תיקיות

```
frontend/
├── src/
│   ├── features/                # תכונות לפי עמוד
│   │   ├── auth/               # אימות
│   │   ├── dashboard/         # דף בית
│   │   ├── students/           # ניהול תלמידים
│   │   ├── permissions/        # ניהול הרשאות
│   │   ├── soc/                # מרכז אבטחה
│   │   ├── api/                # מפתחות API
│   │   └── users/              # ניהול משתמשים
│   │
│   ├── shared/                 # קומפוננטים משותפים
│   │   ├── components/         # Layout components
│   │   ├── ui/                 # UI components
│   │   ├── hooks/              # Custom hooks
│   │   └── lib/                # Utilities & API client
│   │
│   ├── types/                  # TypeScript types
│   └── App.tsx                 # נקודת כניסה
```

### שכבות ארכיטקטורה

#### 1. Pages/Features
- **תפקיד**: עמודים ראשיים של האפליקציה
- **מיקום**: `features/*/`
- **אחריות**:
  - UI של התכונה
  - ניהול state מקומי
  - קריאה ל-API

#### 2. Shared Components
- **תפקיד**: קומפוננטים משותפים
- **מיקום**: `shared/components/`, `shared/ui/`
- **אחריות**:
  - קומפוננטים לשימוש חוזר
  - Layout components
  - UI primitives

#### 3. Contexts & Hooks
- **תפקיד**: ניהול state גלובלי
- **מיקום**: `features/*/Context.tsx`, `shared/hooks/`
- **דוגמאות**:
  - `AuthContext` - אימות
  - `PermissionsContext` - הרשאות
  - `ThemeContext` - נושא (light/dark)

#### 4. API Client
- **תפקיד**: תקשורת עם Backend
- **מיקום**: `shared/lib/api.ts`
- **כלי**: Axios

---

## מערכת הרשאות

### ארכיטקטורה

המערכת מבוססת על שני סוגי הרשאות:

1. **Page Permissions** - הרשאות דפים
   - `page:students:view` - צפייה בדף תלמידים
   - `page:students:edit` - עריכה בדף תלמידים

2. **API Permissions** - הרשאות API
   - `students:read` - קריאת תלמידים
   - `students:create` - יצירת תלמידים
   - `students:update` - עדכון תלמידים
   - `students:delete` - מחיקת תלמידים

### זרימת הרשאות

```
User/Role
    │
    ├─► Direct Permissions (UserPermission)
    │
    └─► Role Permissions (RolePermission)
            │
            └─► Permission Registry
                    │
                    ├─► Page Permissions
                    │       └─► Auto-grant API Permissions
                    │
                    └─► API Permissions
```

### Permission Registry

כל הדפים וה-APIs מוגדרים ב-`permission-registry.ts`:

```typescript
{
  'students': {
    page: 'students',
    viewAPIs: ['students:read', 'tracks:read', ...],
    editAPIs: ['students:create', 'students:update', ...],
  }
}
```

כשנותנים הרשאת דף, המערכת נותנת אוטומטית את כל ה-API permissions הקשורים.

---

## מערכת אבטחה

### שכבות אבטחה

1. **Authentication** - אימות
   - JWT tokens
   - API Keys
   - Session management

2. **Authorization** - הרשאות
   - Permission-based access control
   - Role-based access control
   - Admin-only endpoints

3. **Security Middleware**
   - Helmet.js - Security headers
   - CORS - Cross-origin protection
   - CSRF Protection
   - Rate Limiting
   - IP Blocking

4. **Audit Logging**
   - כל פעולה נרשמת
   - מעקב אחר IP, User-Agent
   - SOC monitoring

---

## Database Schema

### מודלים עיקריים

#### Users & Permissions
- `Soldier` - משתמשים/עובדים
- `Permission` - הרשאות
- `UserPermission` - הרשאות משתמש
- `RolePermission` - הרשאות תפקיד
- `Role` - תפקידים
- `Department` - מחלקות

#### Academic
- `Student` - תלמידים
- `Cohort` - מחזורים
- `Track` - מגמות
- `Class` - כיתות
- `Enrollment` - רישום לכיתות
- `StudentExit` - יציאת תלמידים

#### Security
- `AuditLog` - לוגי פעילות
- `BlockedIP` - IPs חסומים
- `TrustedUser` - משתמשים מהימנים
- `ApiKey` - מפתחות API

### יחסים עיקריים

```
Student ──► Cohort
Student ──► Enrollment ──► Class
Student ──► StudentExit

Soldier ──► Department
Soldier ──► Role
Soldier ──► UserPermission ──► Permission
Role ──► RolePermission ──► Permission
```

---

## תקשורת בזמן אמת

### WebSocket (SOC)

המערכת משתמשת ב-WebSocket לניטור אבטחה בזמן אמת:

- **Backend**: `lib/soc/soc-websocket.ts`
- **Frontend**: `features/soc/useSOCWebSocket.ts`
- **שימוש**: עדכונים בזמן אמת על אירועי אבטחה

---

## Error Handling

### Backend

1. **Validation Errors** - Zod validation
2. **Business Logic Errors** - Custom error classes
3. **Database Errors** - Prisma error handling
4. **Global Error Handler** - `lib/utils/errors.ts`

### Frontend

1. **API Errors** - Axios interceptors
2. **Component Errors** - Error boundaries
3. **Error Pages** - 403, 404, 500

---

## Logging & Monitoring

### Structured Logging

- **Backend**: Pino logger
- **Format**: JSON structured logs
- **Levels**: error, warn, info, debug

### Metrics

- **Health Checks**: `/health`, `/ready`, `/live`
- **Metrics Endpoint**: `/metrics`
- **SOC Metrics**: SOC-specific metrics

### Audit Logging

- כל פעולה נרשמת ב-`AuditLog`
- כולל: user, action, resource, IP, timestamp
- SOC monitoring ו-anomaly detection

---

## Environment Variables

### Backend

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-key"

# Server
PORT=3000
NODE_ENV="development"

# Frontend
FRONTEND_URL="http://localhost:5173"

# Auto-seed (development only)
AUTO_SEED="true"
```

### Frontend

```env
VITE_API_URL="http://localhost:3000/api"
```

---

## Deployment

### Development

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Production

- **Backend**: PM2 / Docker
- **Frontend**: Static files (Nginx)
- **Database**: SQLite (או PostgreSQL/MySQL)

ראה `docs/deployment/PHYSICAL_SERVER_DEPLOYMENT.md` לפרטים.

---

## Best Practices

### Backend

1. **Type Safety** - אין `any` types
2. **Error Handling** - תמיד handle errors
3. **Validation** - Zod validation לכל קלט
4. **Logging** - Structured logging עם Pino
5. **Transactions** - שימוש ב-transactions לפעולות מרובות

### Frontend

1. **Type Safety** - TypeScript strict mode
2. **Component Structure** - Feature-based organization
3. **State Management** - Context API + local state
4. **Error Handling** - Error boundaries
5. **Performance** - Lazy loading, code splitting

---

## סיכום

המערכת בנויה בארכיטקטורה מודולרית עם הפרדה ברורה בין שכבות:

- **Backend**: Express + Prisma + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Security**: Multi-layer security
- **Permissions**: Page-based + API-based
- **Monitoring**: Audit logging + SOC

למידע נוסף:
- [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
- [Frontend Development Guide](./FRONTEND_DEVELOPMENT.md)
- [Database Guide](./DATABASE_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
