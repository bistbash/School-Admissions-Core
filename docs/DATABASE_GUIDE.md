# מדריך Database

מדריך מקיף לעבודה עם Database במערכת School Admissions Core.

---

## תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [Database Schema](#database-schema)
3. [Migrations](#migrations)
4. [Seeding](#seeding)
5. [Prisma Client](#prisma-client)
6. [Queries](#queries)
7. [Relations](#relations)
8. [Best Practices](#best-practices)

---

## סקירה כללית

המערכת משתמשת ב:
- **Prisma ORM** - Object-Relational Mapping
- **SQLite** - Database (עם אפשרות להחלפה ל-PostgreSQL/MySQL)

### מיקום קבצים

- **Schema**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`
- **Client**: `backend/src/lib/database/prisma.ts`

---

## Database Schema

### מודלים עיקריים

#### Users & Permissions

```prisma
model Soldier {
  id                     Int              @id @default(autoincrement())
  personalNumber         String?          @unique
  name                   String?
  email                  String           @unique
  password               String
  isAdmin                Boolean          @default(false)
  approvalStatus         String           @default("CREATED")
  needsProfileCompletion Boolean          @default(true)
  permissions            UserPermission[]
  // ...
}

model Permission {
  id              Int              @id @default(autoincrement())
  name            String           @unique
  resource        String
  action          String
  userPermissions UserPermission[]
  rolePermissions RolePermission[]
}

model UserPermission {
  id           Int        @id @default(autoincrement())
  userId       Int
  permissionId Int
  isActive     Boolean   @default(true)
  // ...
}
```

#### Academic

```prisma
model Student {
  id             Int      @id @default(autoincrement())
  idNumber       String   @unique
  firstName      String
  lastName       String
  gender         String
  cohortId       Int
  status         String   @default("ACTIVE")
  enrollments    Enrollment[]
  exitRecord     StudentExit?
  // ...
}

model Cohort {
  id           Int       @id @default(autoincrement())
  name         String   @unique
  startYear    Int
  isActive     Boolean  @default(true)
  students     Student[]
}

model Class {
  id           Int          @id @default(autoincrement())
  grade        String
  parallel     String?
  track        String?
  academicYear Int
  enrollments  Enrollment[]
}

model Enrollment {
  id             Int      @id @default(autoincrement())
  studentId      Int
  classId        Int
  enrollmentDate DateTime  @default(now())
  // ...
}
```

#### Security

```prisma
model AuditLog {
  id           Int      @id @default(autoincrement())
  userId       Int?
  action       String
  resource     String
  resourceId   Int?
  ipAddress    String?
  status       String
  // ...
}

model BlockedIP {
  id        Int       @id @default(autoincrement())
  ipAddress String    @unique
  reason    String?
  isActive  Boolean   @default(true)
}

model ApiKey {
  id          Int       @id @default(autoincrement())
  key         String    @unique
  name        String
  userId      Int?
  isActive    Boolean   @default(true)
  // ...
}
```

---

## Migrations

### יצירת Migration

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# This will:
# 1. Create migration file in prisma/migrations/
# 2. Apply migration to database
# 3. Regenerate Prisma Client
```

### דוגמה: הוספת שדה חדש

1. **עדכן Schema**:

```prisma
model Student {
  // ... existing fields
  newField String? // Add new field
}
```

2. **צור Migration**:

```bash
npx prisma migrate dev --name add_new_field_to_student
```

3. **Migration File** נוצר אוטומטית:

```sql
-- AlterTable
ALTER TABLE "Student" ADD COLUMN "newField" TEXT;
```

### יישום Migrations

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Reset database (development only - deletes all data!)
npx prisma migrate reset
```

### Rollback

Prisma לא תומך ב-rollback ישיר. יש ליצור migration חדש שמבטל את השינוי:

```prisma
model Student {
  // Remove field
  // newField String? // Comment out or delete
}
```

```bash
npx prisma migrate dev --name remove_new_field
```

---

## Seeding

### Seed Script

המערכת כוללת seed script ב-`backend/src/lib/database/seed.ts`:

```bash
npm run seed
```

### יצירת Seed Data

```typescript
// backend/src/lib/database/seed.ts
import { prisma } from './prisma';

export async function seedDatabase() {
  // Create admin user
  const admin = await prisma.soldier.create({
    data: {
      email: 'admin@school.local',
      password: hashedPassword,
      isAdmin: true,
      approvalStatus: 'APPROVED',
      needsProfileCompletion: false,
    },
  });

  // Create cohorts
  for (let year = 1973; year <= currentYear + 1; year++) {
    await prisma.cohort.create({
      data: {
        name: `Cohort ${year}`,
        startYear: year,
        isActive: true,
      },
    });
  }

  return { admin };
}
```

### Seed Permissions

```bash
npm run seed-permissions
```

זה יוצר את כל ה-permissions המוגדרים ב-`permission-registry.ts`.

---

## Prisma Client

### Import

```typescript
import { prisma } from '../lib/database/prisma';
```

### Basic Operations

#### Create

```typescript
const student = await prisma.student.create({
  data: {
    idNumber: '123456789',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'MALE',
    cohortId: 1,
    studyStartDate: new Date(),
  },
});
```

#### Read

```typescript
// Find unique
const student = await prisma.student.findUnique({
  where: { id: 1 },
});

// Find first
const student = await prisma.student.findFirst({
  where: { status: 'ACTIVE' },
});

// Find many
const students = await prisma.student.findMany({
  where: { status: 'ACTIVE' },
  take: 10,
  skip: 0,
});
```

#### Update

```typescript
const updated = await prisma.student.update({
  where: { id: 1 },
  data: {
    firstName: 'Jane',
  },
});
```

#### Delete

```typescript
await prisma.student.delete({
  where: { id: 1 },
});
```

---

## Queries

### Filtering

```typescript
// Where clause
const students = await prisma.student.findMany({
  where: {
    status: 'ACTIVE',
    gender: 'MALE',
    cohortId: 1,
  },
});

// Multiple conditions
const students = await prisma.student.findMany({
  where: {
    OR: [
      { status: 'ACTIVE' },
      { status: 'GRADUATED' },
    ],
    AND: [
      { gender: 'MALE' },
      { cohortId: 1 },
    ],
  },
});
```

### Sorting

```typescript
const students = await prisma.student.findMany({
  orderBy: [
    { lastName: 'asc' },
    { firstName: 'asc' },
  ],
});
```

### Pagination

```typescript
const page = 1;
const pageSize = 10;

const students = await prisma.student.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

### Counting

```typescript
const count = await prisma.student.count({
  where: { status: 'ACTIVE' },
});
```

### Selecting Fields

```typescript
const students = await prisma.student.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    // Exclude other fields
  },
});
```

---

## Relations

### Include Relations

```typescript
const student = await prisma.student.findUnique({
  where: { id: 1 },
  include: {
    cohort: true,
    enrollments: {
      include: {
        class: true,
      },
    },
  },
});
```

### Nested Writes

```typescript
// Create with relation
const student = await prisma.student.create({
  data: {
    idNumber: '123456789',
    firstName: 'John',
    lastName: 'Doe',
    cohort: {
      connect: { id: 1 },
    },
    enrollments: {
      create: {
        class: {
          connect: { id: 1 },
        },
      },
    },
  },
});
```

### Connect/Disconnect

```typescript
// Connect existing relation
await prisma.student.update({
  where: { id: 1 },
  data: {
    cohort: {
      connect: { id: 2 },
    },
  },
});

// Disconnect relation
await prisma.student.update({
  where: { id: 1 },
  data: {
    cohort: {
      disconnect: true,
    },
  },
});
```

---

## Transactions

### Basic Transaction

```typescript
await prisma.$transaction(async (tx) => {
  const student = await tx.student.create({
    data: { /* ... */ },
  });

  await tx.enrollment.create({
    data: {
      studentId: student.id,
      classId: 1,
    },
  });

  return student;
});
```

### Transaction with Error Handling

```typescript
try {
  const result = await prisma.$transaction(async (tx) => {
    // Multiple operations
  });
} catch (error) {
  // Transaction automatically rolled back
  console.error('Transaction failed:', error);
}
```

### Interactive Transactions

```typescript
await prisma.$transaction(async (tx) => {
  const student = await tx.student.findUnique({
    where: { id: 1 },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  await tx.student.update({
    where: { id: 1 },
    data: { /* ... */ },
  });
});
```

---

## Best Practices

### 1. Always Use Transactions for Multiple Operations

```typescript
// ✅ Good
await prisma.$transaction(async (tx) => {
  await tx.student.create(...);
  await tx.enrollment.create(...);
});

// ❌ Bad
await prisma.student.create(...);
await prisma.enrollment.create(...);
```

### 2. Handle Errors

```typescript
// ✅ Good
try {
  const student = await prisma.student.findUnique({
    where: { id: 1 },
  });
  
  if (!student) {
    throw new Error('Student not found');
  }
} catch (error) {
  // Handle error
}
```

### 3. Use Select for Performance

```typescript
// ✅ Good - Only select needed fields
const students = await prisma.student.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
  },
});

// ❌ Bad - Select all fields
const students = await prisma.student.findMany();
```

### 4. Indexes

הוסף indexes לשדות שמשמשים ל-filtering/sorting:

```prisma
model Student {
  id       Int    @id @default(autoincrement())
  status   String @default("ACTIVE")
  
  @@index([status])  // Add index
}
```

### 5. Cascade Deletes

```prisma
model Enrollment {
  studentId Int
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}
```

---

## Prisma Studio

### פתיחת Prisma Studio

```bash
npx prisma studio
```

זה פותח GUI לניהול database.

---

## סיכום

מדריך זה מכסה את היסודות של עבודה עם Database במערכת. למידע נוסף:

- [Architecture Guide](./ARCHITECTURE.md)
- [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
- [Prisma Documentation](https://www.prisma.io/docs)
