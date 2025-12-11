# Grades, Cohorts & Classes

How the academic system works with grades, cohorts, classes, and dates.

---

## Concepts

### Cohort

Group of students who started in the same year.

- **startYear**: Year cohort started (e.g., 2024)
- **currentGrade**: Current grade (ט', י', י"א, י"ב) - calculated automatically
- **isActive**: Whether cohort is active (last 4 cohorts)

### Class

Specific class in a specific academic year.

- **grade**: ט', י', י"א, י"ב
- **parallel**: 1, 2, 3, etc.
- **track**: מגמה (e.g., "מדעים")
- **academicYear**: Academic year (e.g., 2024)

### Student

- **cohortId**: Which cohort student belongs to
- **studyStartDate**: When student started studying (required)
- **enrollments**: History of class enrollments

---

## Grade Calculation

### Current Grade from Cohort

```typescript
// Cohort 2024 on Dec 15, 2024
academicYear = 2024 (>= Sept 1st)
yearsDiff = 2024 - 2024 = 0
→ Grade: ט'

// Cohort 2024 on Dec 15, 2025
academicYear = 2025
yearsDiff = 2025 - 2024 = 1
→ Grade: י'
```

### Academic Year

- **September 1st** = Start of academic year
- If date >= Sept 1st → academicYear = current year
- If date < Sept 1st → academicYear = current year - 1

---

## Creating Students

### With Cohort

```typescript
await studentsService.create({
  idNumber: "123456789",
  firstName: "John",
  lastName: "Doe",
  cohort: 2024,  // or "מחזור נ"ב"
  studyStartDate: "2024-09-01",
  grade: "ט'",   // Optional - calculated automatically
  parallel: "1",
  track: "מדעים"
});
```

### With Grade Only

```typescript
await studentsService.create({
  idNumber: "123456789",
  firstName: "John",
  lastName: "Doe",
  grade: "י'",   // Cohort calculated automatically
  studyStartDate: "2023-09-01",
  parallel: "1",
  track: "מדעים"
});
```

---

## Automatic Calculations

### Cohort Grade

Calculated automatically based on:
- `startYear`
- Current date
- September 1st rule

### Academic Year

Calculated from current date:
- >= Sept 1st → current year
- < Sept 1st → previous year

### Class Creation

Classes are created automatically when needed:
- Unique by: grade + parallel + track + academicYear
- Created on-demand when enrolling students

---

## Key Dates

- **September 1st**: Start of academic year
- **studyStartDate**: When student started (required)
- **enrollmentDate**: When student enrolled in class

---

## API Endpoints

### Calculate Grade from Cohort

```bash
POST /api/cohorts/calculate-grade
{ "cohort": 2024 }
```

### Calculate Cohort from Grade

```bash
POST /api/cohorts/calculate-cohort
{ "grade": "י'" }
```

### Calculate Start Date

```bash
POST /api/cohorts/calculate-start-date
{ "cohort": 2024 }
```
