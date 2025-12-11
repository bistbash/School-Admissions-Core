# מדריך פיתוח Backend

מדריך מקיף לפיתוח Backend במערכת School Admissions Core.

---

## תוכן עניינים

1. [התחלה מהירה](#התחלה-מהירה)
2. [מבנה הפרויקט](#מבנה-הפרויקט)
3. [יצירת מודול חדש](#יצירת-מודול-חדש)
4. [API Development](#api-development)
5. [Database Operations](#database-operations)
6. [Authentication & Authorization](#authentication--authorization)
7. [Error Handling](#error-handling)
8. [Logging](#logging)
9. [Testing](#testing)
10. [Best Practices](#best-practices)

---

## התחלה מהירה

### דרישות

- Node.js 18+
- npm או yarn
- SQLite (או PostgreSQL/MySQL)

### התקנה

```bash
cd backend
npm install
```

### הגדרת Environment

צור קובץ `.env`:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=3000
NODE_ENV="development"

# Frontend
FRONTEND_URL="http://localhost:5173"

# Auto-seed (development only)
AUTO_SEED="true"
```

### הרצת Migrations

```bash
npx prisma migrate dev
```

### Seed Database

```bash
npm run seed
```

### הרצת שרת פיתוח

```bash
npm run dev
```

---

## מבנה הפרויקט

```
backend/
├── src/
│   ├── lib/                    # ספריות משותפות
│   │   ├── auth/               # אימות
│   │   ├── permissions/        # הרשאות
│   │   ├── audit/              # רישום פעילות
│   │   ├── security/           # אבטחה
│   │   ├── soc/                # SOC
│   │   ├── database/           # Prisma
│   │   ├── middleware/         # Middleware
│   │   └── utils/              # כלי עזר
│   │
│   ├── modules/                 # מודולים
│   │   ├── {module-name}/
│   │   │   ├── {module}.controller.ts
│   │   │   ├── {module}.service.ts
│   │   │   └── {module}.routes.ts
│   │
│   └── server.ts                # נקודת כניסה
│
└── prisma/
    └── schema.prisma            # Database schema
```

---

## יצירת מודול חדש

### שלב 1: יצירת תיקייה

```bash
mkdir -p src/modules/my-module
```

### שלב 2: יצירת Service

`src/modules/my-module/my-module.service.ts`:

```typescript
import { prisma } from '../../lib/database/prisma';

export class MyModuleService {
  async getAll() {
    return await prisma.myModel.findMany();
  }

  async getById(id: number) {
    return await prisma.myModel.findUnique({
      where: { id },
    });
  }

  async create(data: CreateData) {
    return await prisma.myModel.create({
      data,
    });
  }

  async update(id: number, data: UpdateData) {
    return await prisma.myModel.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.myModel.delete({
      where: { id },
    });
  }
}
```

### שלב 3: יצירת Controller

`src/modules/my-module/my-module.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { MyModuleService } from './my-module.service';
import { z } from 'zod';
import { auditFromRequest } from '../../lib/audit/audit';

const myModuleService = new MyModuleService();

const createSchema = z.object({
  name: z.string().min(1),
  // ... other fields
});

export class MyModuleController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await myModuleService.getAll();
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createSchema.parse(req.body);
      const result = await myModuleService.create(validated);
      
      await auditFromRequest(req, 'CREATE', 'MY_MODEL', {
        status: 'SUCCESS',
        resourceId: result.id,
      }).catch(console.error);
      
      res.status(201).json(result);
    } catch (error) {
      await auditFromRequest(req, 'CREATE', 'MY_MODEL', {
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(console.error);
      next(error);
    }
  }
}
```

### שלב 4: יצירת Routes

`src/modules/my-module/my-module.routes.ts`:

```typescript
import { Router } from 'express';
import { MyModuleController } from './my-module.controller';
import { requireAPIPermission } from '../../lib/permissions/api-permission-middleware';

const router = Router();
const controller = new MyModuleController();

// GET /api/my-module
router.get(
  '/',
  requireAPIPermission('my-module', 'read'),
  controller.getAll.bind(controller)
);

// POST /api/my-module
router.post(
  '/',
  requireAPIPermission('my-module', 'create'),
  controller.create.bind(controller)
);

export default router;
```

### שלב 5: הוספה ל-Server

`src/server.ts`:

```typescript
import myModuleRoutes from './modules/my-module/my-module.routes';

// ...

app.use('/api/my-module', myModuleRoutes);
```

---

## API Development

### Validation עם Zod

```typescript
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().int().positive(),
});

// In controller
const validated = createSchema.parse(req.body);
```

### Permission Middleware

```typescript
import { requireAPIPermission } from '../../lib/permissions/api-permission-middleware';

router.get(
  '/',
  requireAPIPermission('students', 'read'),
  controller.getAll.bind(controller)
);
```

### Audit Logging

```typescript
import { auditFromRequest } from '../../lib/audit/audit';

await auditFromRequest(req, 'CREATE', 'STUDENT', {
  status: 'SUCCESS',
  resourceId: result.id,
  details: { /* additional info */ },
});
```

---

## Database Operations

### Prisma Client

```typescript
import { prisma } from '../lib/database/prisma';

// Find many
const students = await prisma.student.findMany({
  where: { status: 'ACTIVE' },
  include: { cohort: true },
});

// Find unique
const student = await prisma.student.findUnique({
  where: { id: 1 },
});

// Create
const newStudent = await prisma.student.create({
  data: {
    idNumber: '123456789',
    firstName: 'John',
    lastName: 'Doe',
    // ...
  },
});

// Update
const updated = await prisma.student.update({
  where: { id: 1 },
  data: { firstName: 'Jane' },
});

// Delete
await prisma.student.delete({
  where: { id: 1 },
});
```

### Transactions

```typescript
await prisma.$transaction(async (tx) => {
  const student = await tx.student.create({ data: {...} });
  await tx.enrollment.create({
    data: {
      studentId: student.id,
      classId: classId,
    },
  });
  return student;
});
```

### Migrations

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

---

## Authentication & Authorization

### Authentication Middleware

```typescript
import { authenticate } from '../../lib/auth/auth';

router.get('/protected', authenticate, controller.getData);
```

### Permission Checks

```typescript
import { hasAPIPermission, hasPagePermission } from '../../lib/permissions/permissions';

// In service
if (!hasAPIPermission(user, 'students', 'create')) {
  throw new Error('Unauthorized');
}
```

### Admin Checks

```typescript
if (!user.isAdmin) {
  throw new Error('Admin access required');
}
```

---

## Error Handling

### Custom Errors

```typescript
import { AppError } from '../../lib/utils/errors';

throw new AppError('Student not found', 404);
```

### Error Handler Middleware

המערכת כוללת global error handler ב-`lib/utils/errors.ts`:

```typescript
// Errors are automatically caught and handled
// Returns appropriate HTTP status codes
```

---

## Logging

### Structured Logging עם Pino

```typescript
import { logger } from '../../lib/utils/logger';

logger.info({ userId: 1, action: 'CREATE' }, 'Student created');
logger.error({ error }, 'Failed to create student');
logger.warn({ ip: req.ip }, 'Suspicious activity detected');
```

### Log Levels

- `logger.error()` - שגיאות
- `logger.warn()` - אזהרות
- `logger.info()` - מידע כללי
- `logger.debug()` - דיבוג (development only)

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { MyModuleService } from './my-module.service';

describe('MyModuleService', () => {
  it('should create item', async () => {
    const service = new MyModuleService();
    const result = await service.create({ name: 'Test' });
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '../server';

describe('GET /api/my-module', () => {
  it('should return items', async () => {
    const res = await request(app)
      .get('/api/my-module')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

---

## Best Practices

### 1. Type Safety

```typescript
// ✅ Good
interface CreateStudentData {
  idNumber: string;
  firstName: string;
  lastName: string;
}

// ❌ Bad
const data: any = req.body;
```

### 2. Error Handling

```typescript
// ✅ Good
try {
  const result = await service.create(data);
  res.json(result);
} catch (error) {
  next(error);
}

// ❌ Bad
const result = await service.create(data);
res.json(result);
```

### 3. Validation

```typescript
// ✅ Good - Always validate input
const validated = schema.parse(req.body);

// ❌ Bad - No validation
const data = req.body;
```

### 4. Transactions

```typescript
// ✅ Good - Use transactions for multiple operations
await prisma.$transaction(async (tx) => {
  // multiple operations
});

// ❌ Bad - Multiple separate operations
await prisma.student.create(...);
await prisma.enrollment.create(...);
```

### 5. Logging

```typescript
// ✅ Good - Structured logging
logger.info({ userId, action: 'CREATE' }, 'Student created');

// ❌ Bad - Console.log
console.log('Student created');
```

### 6. Audit Logging

```typescript
// ✅ Good - Always log important actions
await auditFromRequest(req, 'CREATE', 'STUDENT', {
  status: 'SUCCESS',
  resourceId: result.id,
});

// ❌ Bad - No audit logging
```

### 7. Permissions

```typescript
// ✅ Good - Check permissions
router.get('/', requireAPIPermission('students', 'read'), controller.getAll);

// ❌ Bad - No permission check
router.get('/', controller.getAll);
```

---

## Scripts שימושיים

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production

# Database
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Create and apply migration
npx prisma generate     # Generate Prisma Client

# Seeding
npm run seed            # Seed database
npm run seed-permissions # Seed permissions
```

---

## סיכום

מדריך זה מכסה את היסודות של פיתוח Backend במערכת. למידע נוסף:

- [Architecture Guide](./ARCHITECTURE.md)
- [Database Guide](./DATABASE_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Permissions System](./PERMISSIONS_SYSTEM.md)
