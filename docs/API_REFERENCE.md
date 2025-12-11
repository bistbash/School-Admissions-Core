# API Reference

תיעוד מקיף של כל ה-API endpoints במערכת.

---

## תוכן עניינים

1. [Authentication](#authentication)
2. [Students](#students)
3. [Cohorts](#cohorts)
4. [Tracks](#tracks)
5. [Classes](#classes)
6. [Permissions](#permissions)
7. [SOC](#soc)
8. [API Keys](#api-keys)
9. [Search](#search)
10. [Common Patterns](#common-patterns)

---

## Authentication

### POST /api/auth/login

התחברות למשתמש.

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
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false
  }
}
```

**Permissions:** Public

---

### GET /api/auth/me

קבלת פרטי המשתמש הנוכחי.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "isAdmin": false,
  "approvalStatus": "APPROVED"
}
```

**Permissions:** Authenticated

---

### POST /api/auth/complete-profile

השלמת פרופיל משתמש.

**Request:**
```json
{
  "personalNumber": "123456789",
  "name": "John Doe",
  "type": "PERMANENT"
}
```

**Permissions:** Authenticated (only if needsProfileCompletion)

---

## Students

### GET /api/students

קבלת רשימת תלמידים.

**Query Parameters:**
- `status` - ACTIVE, GRADUATED, LEFT, ARCHIVED
- `grade` - ט', י', י"א, י"ב
- `cohortId` - ID של מחזור
- `gender` - MALE, FEMALE
- `academicYear` - שנת לימודים

**Response:**
```json
[
  {
    "id": 1,
    "idNumber": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "MALE",
    "cohort": {
      "id": 1,
      "name": "Cohort 2024",
      "startYear": 2024
    },
    "status": "ACTIVE"
  }
]
```

**Permissions:** `students:read` or `page:students:view`

---

### GET /api/students/:id

קבלת תלמיד לפי ID.

**Response:**
```json
{
  "id": 1,
  "idNumber": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "MALE",
  "cohort": { ... },
  "enrollments": [ ... ],
  "status": "ACTIVE"
}
```

**Permissions:** `students:read` or `page:students:view`

---

### POST /api/students

יצירת תלמיד חדש.

**Request:**
```json
{
  "idNumber": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "MALE",
  "cohort": 2024,
  "studyStartDate": "2024-09-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "idNumber": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  ...
}
```

**Permissions:** `students:create` or `page:students:edit`

---

### PUT /api/students/:id

עדכון תלמיד.

**Request:**
```json
{
  "firstName": "Jane",
  "status": "GRADUATED"
}
```

**Permissions:** `students:update` or `page:students:edit`

---

### DELETE /api/students/:id

מחיקת תלמיד.

**Permissions:** `students:delete` or `page:students:edit`

---

### POST /api/students/upload

העלאת קובץ Excel עם תלמידים.

**Request:** Multipart form data
- `file` - Excel file

**Response:**
```json
{
  "success": true,
  "created": 10,
  "updated": 5,
  "errors": []
}
```

**Permissions:** `students:create` or `page:students:edit`

---

## Cohorts

### GET /api/cohorts

קבלת רשימת מחזורים.

**Query Parameters:**
- `isActive` - true/false

**Response:**
```json
[
  {
    "id": 1,
    "name": "Cohort 2024",
    "startYear": 2024,
    "isActive": true
  }
]
```

**Permissions:** `cohorts:read` or `page:students:view`

---

### GET /api/cohorts/:id

קבלת מחזור לפי ID.

**Permissions:** `cohorts:read` or `page:students:view`

---

### POST /api/cohorts/calculate-grade

חישוב כיתה לפי מחזור ושנה.

**Request:**
```json
{
  "cohortYear": 2024,
  "academicYear": 2025
}
```

**Response:**
```json
{
  "grade": "י'"
}
```

**Permissions:** Public (utility endpoint)

---

## Tracks

### GET /api/tracks

קבלת רשימת מגמות.

**Response:**
```json
[
  {
    "id": 1,
    "name": "מדעים",
    "description": "מגמת מדעים",
    "isActive": true
  }
]
```

**Permissions:** `tracks:read` or `page:students:view`

---

### POST /api/tracks

יצירת מגמה חדשה.

**Request:**
```json
{
  "name": "מדעים",
  "description": "מגמת מדעים"
}
```

**Permissions:** `tracks:create` or `page:students:edit`

---

## Classes

### GET /api/classes

קבלת רשימת כיתות.

**Query Parameters:**
- `academicYear` - שנת לימודים
- `grade` - כיתה
- `isActive` - true/false

**Response:**
```json
[
  {
    "id": 1,
    "grade": "י'",
    "parallel": "1",
    "track": "מדעים",
    "academicYear": 2025,
    "isActive": true
  }
]
```

**Permissions:** `classes:read` or `page:students:view`

---

### POST /api/classes

יצירת כיתה חדשה.

**Request:**
```json
{
  "grade": "י'",
  "parallel": "1",
  "track": "מדעים",
  "academicYear": 2025
}
```

**Permissions:** `classes:create` or `page:students:edit`

---

## Permissions

### GET /api/permissions/pages

קבלת רשימת כל הדפים וההרשאות.

**Response:**
```json
[
  {
    "page": "students",
    "displayName": "Students",
    "displayNameHebrew": "תלמידים",
    "category": "academic",
    "viewAPIs": ["students:read", ...],
    "editAPIs": ["students:create", ...]
  }
]
```

**Permissions:** Authenticated

---

### GET /api/permissions/my-page-permissions

קבלת הרשאות הדפים של המשתמש הנוכחי.

**Response:**
```json
{
  "students": {
    "view": true,
    "edit": true
  },
  "soc": {
    "view": true,
    "edit": false
  }
}
```

**Permissions:** Authenticated

---

### POST /api/permissions/users/:userId/grant-page

מתן הרשאת דף למשתמש.

**Request:**
```json
{
  "page": "students",
  "action": "view"
}
```

**Permissions:** Admin only

---

### POST /api/permissions/users/:userId/revoke-page

הסרת הרשאת דף ממשתמש.

**Request:**
```json
{
  "page": "students",
  "action": "view"
}
```

**Permissions:** Admin only

---

## SOC

### GET /api/soc/audit-logs

קבלת לוגי ביקורת.

**Query Parameters:**
- `userId` - סינון לפי משתמש
- `action` - סינון לפי פעולה
- `resource` - סינון לפי משאב
- `status` - SUCCESS, FAILURE
- `startDate`, `endDate` - טווח תאריכים
- `limit`, `offset` - pagination

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "userId": 1,
      "action": "CREATE",
      "resource": "STUDENT",
      "status": "SUCCESS",
      "ipAddress": "127.0.0.1",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**Permissions:** `soc:read` or `page:soc:view`

---

### GET /api/soc/stats

קבלת סטטיסטיקות אבטחה.

**Response:**
```json
{
  "totalLogs": 1000,
  "successLogs": 950,
  "failureLogs": 50,
  "uniqueUsers": 10,
  "uniqueIPs": 5
}
```

**Permissions:** `soc:read` or `page:soc:view`

---

### PUT /api/soc/incidents/:id

עדכון אירוע אבטחה.

**Request:**
```json
{
  "incidentStatus": "RESOLVED",
  "priority": "HIGH",
  "analystNotes": "Resolved issue"
}
```

**Permissions:** `soc:update` or `page:soc:edit`

---

## API Keys

### GET /api/api-keys

קבלת מפתחות API של המשתמש.

**Response:**
```json
[
  {
    "id": 1,
    "name": "My API Key",
    "lastUsedAt": "2024-01-01T00:00:00Z",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Permissions:** Authenticated

---

### POST /api/api-keys

יצירת מפתח API חדש.

**Request:**
```json
{
  "name": "My API Key"
}
```

**Response:**
```json
{
  "id": 1,
  "key": "api-key-here",
  "name": "My API Key"
}
```

**Permissions:** `api-keys:create` or `page:api-keys:edit`

---

### DELETE /api/api-keys/:id

ביטול מפתח API.

**Permissions:** Authenticated (own keys) or Admin (all keys)

---

## Search

### GET /api/search/pages

חיפוש דפים.

**Query Parameters:**
- `q` - שאילתת חיפוש

**Response:**
```json
[
  {
    "page": "students",
    "displayName": "Students",
    "displayNameHebrew": "תלמידים"
  }
]
```

**Permissions:** Authenticated

---

## Common Patterns

### Authentication

כל ה-API endpoints (חוץ מ-public) דורשים authentication:

```bash
# Add Authorization header
Authorization: Bearer <jwt-token>
```

### Error Responses

```json
{
  "error": "Error message",
  "details": {
    "field": "error message"
  }
}
```

### Pagination

```json
{
  "data": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Permissions

כל endpoint דורש permission מתאים:
- `resource:action` - API permission
- `page:resource:action` - Page permission

---

## סיכום

מדריך זה מכסה את כל ה-API endpoints העיקריים. למידע נוסף:

- [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
- [Permissions System](./PERMISSIONS_SYSTEM.md)
- [Architecture Guide](./ARCHITECTURE.md)
