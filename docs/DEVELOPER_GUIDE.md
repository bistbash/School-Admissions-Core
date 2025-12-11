# Developer Guide

Quick reference guide for developers working on School Admissions Core.

---

## Quick Setup

```bash
# Run setup script
./setup.sh

# Or manually:
cd backend && npm install && npx prisma migrate dev && npm run seed
cd ../frontend && npm install
```

---

## Architecture

### Tech Stack

**Backend:**
- Node.js + Express 5
- TypeScript
- Prisma ORM (SQLite)
- JWT Authentication
- Socket.io (WebSocket)

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Project Structure

```
backend/
├── src/
│   ├── lib/          # Shared libraries (auth, permissions, security)
│   ├── modules/      # Feature modules (students, cohorts, etc.)
│   └── server.ts     # Entry point
└── prisma/
    └── schema.prisma # Database schema

frontend/
├── src/
│   ├── features/     # Feature pages
│   ├── shared/       # Shared components
│   └── App.tsx       # Entry point
```

---

## Permissions System

### How It Works

1. **Page Permissions**: `page:pageName:view` or `page:pageName:edit`
2. **API Permissions**: `resource:action` (e.g., `students:read`)

When granting page permission, all related API permissions are automatically granted.

### Adding New Permissions

1. Add page to `backend/src/lib/permissions/permission-registry.ts`
2. Run `npm run seed-permissions`
3. Protect routes with `requireResourcePagePermission('resource', 'action')`
4. Protect frontend with `<PermissionGuard page="pageName" pageAction="view">`

See [PERMISSIONS_AND_SECURITY_GUIDE.md](./PERMISSIONS_AND_SECURITY_GUIDE.md) for details.

---

## Security Layers

1. **Authentication**: JWT tokens or API keys
2. **Authorization**: Permission-based access control
3. **Rate Limiting**: API and login rate limits
4. **Input Validation**: Zod schemas
5. **IP Blocking**: Block suspicious IPs
6. **Audit Logging**: All actions logged

---

## Grades, Cohorts & Classes

### Concepts

- **Cohort**: Group of students who started in the same year
- **Class**: Specific class in a specific academic year
- **Grade**: ט', י', י"א, י"ב (9th, 10th, 11th, 12th)

### Key Dates

- **September 1st**: Start of academic year
- **studyStartDate**: When student started studying
- **academicYear**: Current academic year (calculated from date)

### Automatic Calculations

- Cohort grade is calculated automatically based on `startYear` and current date
- Academic year is calculated from current date (>= Sept 1st = current year)

See [GRADES_COHORTS_CLASSES_GUIDE.md](./GRADES_COHORTS_CLASSES_GUIDE.md) for details.

---

## Common Tasks

### Create New Module

```bash
# 1. Create directory
mkdir -p backend/src/modules/my-module

# 2. Create files
# - my-module.service.ts (business logic)
# - my-module.controller.ts (HTTP handlers)
# - my-module.routes.ts (route definitions)

# 3. Add to server.ts
app.use('/api/my-module', myModuleRoutes);
```

### Create New Page

```bash
# Use the page generator
cd backend
npm run create-page
```

### Database Operations

```bash
# Create migration
npx prisma migrate dev --name add_field

# Open Prisma Studio
npx prisma studio

# Seed database
npm run seed
```

---

## API Development

### Route Protection

```typescript
// Protect with permission
router.get(
  '/',
  requireResourcePagePermission('students', 'read'),
  controller.getAll
);
```

### Validation

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

const validated = schema.parse(req.body);
```

### Error Handling

```typescript
try {
  const result = await service.create(data);
  res.json(result);
} catch (error) {
  next(error); // Global error handler
}
```

---

## Frontend Development

### Adding New Page

```tsx
// 1. Create page component
// frontend/src/features/my-page/MyPage.tsx

// 2. Add route
<Route 
  path="my-page" 
  element={
    <PermissionGuard page="my-page" pageAction="view">
      <MyPage />
    </PermissionGuard>
  } 
/>
```

### API Calls

```tsx
import { apiClient } from '@/shared/lib/api';

const data = await apiClient.get('/students');
```

### Permissions

```tsx
import { usePermissions } from '@/features/permissions/PermissionsContext';

const { hasPagePermission } = usePermissions();
const canEdit = hasPagePermission('students', 'edit');
```

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
AUTO_SEED="true"
```

### Frontend (.env)

```env
VITE_API_URL="http://localhost:3000/api"
```

---

## Scripts

### Backend

```bash
npm run dev              # Start dev server
npm run seed             # Seed database
npm run seed-permissions # Seed permissions
npx prisma studio        # Open Prisma Studio
```

### Frontend

```bash
npm run dev              # Start dev server
npm run build            # Build for production
```

---

## Troubleshooting

### Database Issues

```bash
# Reset database
cd backend
npx prisma migrate reset
npm run seed
```

### Permission Issues

```bash
# Re-seed permissions
npm run seed-permissions
```

### Port Already in Use

```bash
# Find process
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Kill process
kill -9 <PID>
```

---

## Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture
- [Permissions & Security](./PERMISSIONS_AND_SECURITY_GUIDE.md) - Security guide
- [Grades, Cohorts & Classes](./GRADES_COHORTS_CLASSES_GUIDE.md) - Academic system
- [API Reference](./API_REFERENCE.md) - API endpoints
- [Backend Development](./BACKEND_DEVELOPMENT.md) - Backend guide
- [Frontend Development](./FRONTEND_DEVELOPMENT.md) - Frontend guide
