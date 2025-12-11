# API Reference

API endpoints documentation.

---

## Authentication

### POST /api/auth/login
Login user.

**Request:**
```json
{ "email": "user@example.com", "password": "password" }
```

**Response:**
```json
{ "token": "jwt-token", "user": { "id": 1, "email": "..." } }
```

---

## Students

### GET /api/students
Get all students.

**Query:** `status`, `grade`, `cohortId`, `gender`, `academicYear`

**Permissions:** `students:read` or `page:students:view`

### GET /api/students/:id
Get student by ID.

**Permissions:** `students:read` or `page:students:view`

### POST /api/students
Create student.

**Request:**
```json
{
  "idNumber": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "MALE",
  "cohort": 2024,
  "studyStartDate": "2024-09-01",
  "grade": "ט'",
  "parallel": "1",
  "track": "מדעים"
}
```

**Permissions:** `students:create` or `page:students:edit`

### PUT /api/students/:id
Update student.

**Permissions:** `students:update` or `page:students:edit`

### DELETE /api/students/:id
Delete student.

**Permissions:** `students:delete` or `page:students:edit`

### POST /api/students/upload
Upload students from Excel file.

**Permissions:** `students:create` or `page:students:edit`

---

## Cohorts

### GET /api/cohorts
Get all cohorts.

**Query:** `isActive` (true/false)

**Permissions:** `cohorts:read` or `page:students:view`

### POST /api/cohorts/calculate-grade
Calculate grade from cohort.

**Request:** `{ "cohort": 2024 }`

**Response:** `{ "grade": "ט'" }`

### POST /api/cohorts/calculate-cohort
Calculate cohort from grade.

**Request:** `{ "grade": "י'" }`

**Response:** `{ "cohort": 2023, "startYear": 2023 }`

---

## Permissions

### GET /api/permissions/pages
Get all pages and permissions.

**Permissions:** Authenticated

### GET /api/permissions/my-page-permissions
Get current user's page permissions.

**Permissions:** Authenticated

### POST /api/permissions/users/:userId/grant-page
Grant page permission to user.

**Request:** `{ "page": "students", "action": "view" }`

**Permissions:** Admin only

### POST /api/permissions/users/:userId/revoke-page
Revoke page permission from user.

**Request:** `{ "page": "students", "action": "view" }`

**Permissions:** Admin only

---

## SOC

### GET /api/soc/audit-logs
Get audit logs.

**Query:** `userId`, `action`, `resource`, `status`, `startDate`, `endDate`, `limit`, `offset`

**Permissions:** `soc:read` or `page:soc:view`

### GET /api/soc/stats
Get security statistics.

**Permissions:** `soc:read` or `page:soc:view`

### PUT /api/soc/incidents/:id
Update security incident.

**Permissions:** `soc:update` or `page:soc:edit`

---

## API Keys

### GET /api/api-keys
Get user's API keys.

**Permissions:** Authenticated

### POST /api/api-keys
Create API key.

**Request:** `{ "name": "My API Key" }`

**Permissions:** `api-keys:create` or `page:api-keys:edit`

### DELETE /api/api-keys/:id
Revoke API key.

**Permissions:** Authenticated (own keys) or Admin

---

## Common Patterns

### Authentication

All endpoints (except public) require:
```
Authorization: Bearer <jwt-token>
```

Or:
```
X-API-Key: sk_<api-key>
```

### Error Response

```json
{
  "error": "Error message",
  "details": { "field": "error message" }
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

---

## Permissions

Every endpoint requires appropriate permission:
- `resource:action` - API permission
- `page:resource:action` - Page permission

Admins have full access automatically.
