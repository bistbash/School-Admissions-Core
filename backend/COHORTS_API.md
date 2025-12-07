# Cohorts API Documentation

## Overview

ה-API למחזורים כבר קיים ופועל! כל ה-endpoints זמינים תחת `/api/cohorts`.

## Authentication

כל ה-endpoints דורשים authentication (JWT token או API key).

```bash
# עם JWT token
Authorization: Bearer <your-jwt-token>

# או עם API key
X-API-Key: sk_...
```

## Endpoints

### 1. Get All Cohorts
**GET** `/api/cohorts`

קבלת כל המחזורים (או רק פעילים).

**Query Parameters:**
- `isActive` (boolean, optional) - סינון לפי מחזורים פעילים

**Response:**
```json
[
  {
    "id": 1,
    "name": "מחזור 2024",
    "startYear": 2024,
    "currentGrade": "ט'",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "students": [...],
    "_count": {
      "students": 150
    }
  }
]
```

**Example:**
```bash
# Get all cohorts
curl -X GET http://localhost:3000/api/cohorts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only active cohorts
curl -X GET "http://localhost:3000/api/cohorts?isActive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Cohort by ID
**GET** `/api/cohorts/:id`

קבלת מחזור ספציפי לפי ID.

**Response:**
```json
{
  "id": 1,
  "name": "מחזור 2024",
  "startYear": 2024,
  "currentGrade": "ט'",
  "isActive": true,
  "students": [
    {
      "id": 1,
      "idNumber": "123456789",
      "firstName": "יוסי",
      "lastName": "כהן",
      ...
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/cohorts/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create New Cohort
**POST** `/api/cohorts`

יצירת מחזור חדש.

**Request Body:**
```json
{
  "name": "מחזור 2025",
  "startYear": 2025,
  "currentGrade": "ט'"
}
```

**Validation:**
- `name` (string, required) - שם המחזור
- `startYear` (number, required) - שנת מחזור (1954 עד current year + 1)
- `currentGrade` (string, required) - כיתה נוכחית: `ט'`, `י'`, `י"א`, `י"ב`, `י"ג`, או `י"ד`

**Response:**
```json
{
  "id": 2,
  "name": "מחזור 2025",
  "startYear": 2025,
  "currentGrade": "ט'",
  "isActive": true,
  "createdAt": "2025-12-07T18:00:00.000Z",
  "updatedAt": "2025-12-07T18:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/cohorts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "מחזור 2025",
    "startYear": 2025,
    "currentGrade": "ט\'"
  }'
```

### 4. Update Cohort
**PUT** `/api/cohorts/:id`

עדכון מחזור קיים.

**Request Body:**
```json
{
  "name": "מחזור 2025 (עודכן)",
  "currentGrade": "י'",
  "isActive": true
}
```

**Validation:**
- `name` (string, optional) - שם המחזור
- `currentGrade` (string, optional) - כיתה נוכחית
- `isActive` (boolean, optional) - האם פעיל

**Response:**
```json
{
  "id": 2,
  "name": "מחזור 2025 (עודכן)",
  "startYear": 2025,
  "currentGrade": "י'",
  "isActive": true,
  "students": [...],
  "updatedAt": "2025-12-07T18:30:00.000Z"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/cohorts/2 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentGrade": "י\'"
  }'
```

### 5. Delete Cohort (Soft Delete)
**DELETE** `/api/cohorts/:id`

מחיקת מחזור (soft delete - רק מסמן כלא פעיל).

**Response:**
```json
{
  "id": 2,
  "name": "מחזור 2025",
  "startYear": 2025,
  "currentGrade": "ט'",
  "isActive": false,
  "updatedAt": "2025-12-07T19:00:00.000Z"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/cohorts/2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Validation Rules

### Start Year
- **Minimum**: 1954
- **Maximum**: Current year + 1
- **Type**: Integer

### Current Grade
- **Allowed values**: `ט'`, `י'`, `י"א`, `י"ב`, `י"ג`, `י"ד`
- **Required**: Yes (on create)

### Name
- **Required**: Yes (on create)
- **Unique**: Yes (cannot have two cohorts with same name)

## Error Responses

### 400 Bad Request
```json
{
  "error": "שנת מחזור חייבת להיות בין 1954 ל-2026. התקבל: 2027"
}
```

### 401 Unauthorized
```json
{
  "error": "No token or API key provided"
}
```

### 404 Not Found
```json
{
  "error": "Cohort not found"
}
```

### 409 Conflict
```json
{
  "error": "Cohort with this name already exists"
}
```

## Frontend Usage

### React/TypeScript Example

```typescript
import apiClient from './lib/api';

// Get all cohorts
const fetchCohorts = async () => {
  const response = await apiClient.get('/cohorts?isActive=true');
  return response.data;
};

// Create new cohort
const createCohort = async (name: string, startYear: number, currentGrade: string) => {
  const response = await apiClient.post('/cohorts', {
    name,
    startYear,
    currentGrade,
  });
  return response.data;
};

// Update cohort
const updateCohort = async (id: number, data: { name?: string; currentGrade?: string }) => {
  const response = await apiClient.put(`/cohorts/${id}`, data);
  return response.data;
};

// Delete cohort
const deleteCohort = async (id: number) => {
  const response = await apiClient.delete(`/cohorts/${id}`);
  return response.data;
};
```

## Use Cases

### 1. Get All Active Cohorts for Dropdown
```typescript
const cohorts = await apiClient.get('/cohorts?isActive=true');
// Use in dropdown: cohorts.data.map(c => ({ value: c.id, label: c.name }))
```

### 2. Create Cohort Before Creating Student
```typescript
// Create cohort first
const cohort = await apiClient.post('/cohorts', {
  name: 'מחזור 2025',
  startYear: 2025,
  currentGrade: 'ט\'',
});

// Then use cohort.id when creating student
await apiClient.post('/students', {
  ...studentData,
  cohortId: cohort.data.id,
});
```

### 3. Get Cohort with All Students
```typescript
const cohort = await apiClient.get('/cohorts/1');
// cohort.data.students contains all students in this cohort
```

### 4. Update Cohort Grade After Promotion
```typescript
// After promoting students, update cohort grade
await apiClient.put('/cohorts/1', {
  currentGrade: 'י\'',
});
```

## Integration with Students API

כשמשתמשים ב-Students API, `cohortId` הוא required:

```json
POST /api/students
{
  "idNumber": "123456789",
  "firstName": "יוסי",
  "lastName": "כהן",
  "gender": "MALE",
  "grade": "ט'",
  "cohortId": 1,  // ← צריך להיות cohort קיים
  "studyStartDate": "2024-09-01T00:00:00.000Z"
}
```

## Summary

✅ **כל ה-API endpoints למחזורים כבר קיימים ופועלים!**

- ✅ GET `/api/cohorts` - קבלת כל המחזורים
- ✅ GET `/api/cohorts/:id` - קבלת מחזור ספציפי
- ✅ POST `/api/cohorts` - יצירת מחזור חדש
- ✅ PUT `/api/cohorts/:id` - עדכון מחזור
- ✅ DELETE `/api/cohorts/:id` - מחיקת מחזור (soft delete)

**כל ה-endpoints מוגנים ב-authentication ודורשים JWT token או API key.**

## Documentation

לצפייה בתיעוד המלא של כל ה-API endpoints:
```bash
GET /api/docs
```

זה יחזיר JSON עם כל ה-endpoints הזמינים, כולל cohorts.
