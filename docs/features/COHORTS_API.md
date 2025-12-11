# Cohorts API

API endpoints for managing student cohorts.

---

## Endpoints

### GET /api/cohorts
Get all cohorts.

**Query:** `isActive` (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "name": "מחזור נ"ב",
    "startYear": 2024,
    "currentGrade": "ט'",
    "isActive": true
  }
]
```

### GET /api/cohorts/:id
Get cohort by ID.

### POST /api/cohorts
Create new cohort.

**Request:**
```json
{
  "startYear": 2024
}
```

**Note:** Name is auto-generated from startYear using Hebrew Gematria.

---

## Calculation Endpoints

### POST /api/cohorts/calculate-grade
Calculate grade from cohort.

**Request:** `{ "cohort": 2024 }`

**Response:** `{ "grade": "ט'" }`

### POST /api/cohorts/calculate-cohort
Calculate cohort from grade.

**Request:** `{ "grade": "י'" }`

**Response:** `{ "cohort": 2023, "startYear": 2023 }`

### POST /api/cohorts/calculate-start-date
Calculate study start date from cohort.

**Request:** `{ "cohort": 2024 }`

**Response:** `{ "startDate": "2024-09-01" }`

### POST /api/cohorts/validate-match
Validate that cohort and grade match.

**Request:** `{ "cohort": 2024, "grade": "ט'" }`

**Response:** `{ "matches": true }`

---

## Automatic Grade Calculation

Cohort grade is calculated automatically based on:
- `startYear`
- Current date
- September 1st rule (start of academic year)

---

## Permissions

All endpoints require: `cohorts:read` or `page:students:view`
