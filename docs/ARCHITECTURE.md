# Architecture Overview

System architecture and design patterns for School Admissions Core.

---

## Tech Stack

**Backend:**
- Node.js + Express 5
- TypeScript
- Prisma ORM (SQLite)
- JWT + API Keys (Authentication)
- Socket.io (WebSocket)

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router

---

## Architecture Layers

### Backend

```
Routes → Controllers → Services → Database
```

- **Routes**: Define endpoints, apply middleware
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic
- **Database**: Prisma ORM

### Frontend

```
Pages → Components → Hooks → API Client
```

- **Pages**: Feature pages
- **Components**: Reusable UI components
- **Hooks**: Custom hooks for state/logic
- **API Client**: Axios-based client

---

## Permission System

### Two-Level Permissions

1. **Page Permissions**: `page:pageName:view` or `page:pageName:edit`
2. **API Permissions**: `resource:action` (e.g., `students:read`)

### Flow

```
User Request
  ↓
Authentication (JWT/API Key)
  ↓
Permission Check
  ├─ Admin? → Full Access
  ├─ Page Permission? → Check API Permissions
  └─ Direct API Permission? → Allow
```

### Permission Registry

All pages and APIs defined in `backend/src/lib/permissions/permission-registry.ts`.

When granting page permission, related API permissions are automatically granted.

---

## Security Layers

1. **Helmet.js**: Security headers
2. **CORS**: Cross-origin protection
3. **Authentication**: JWT tokens or API keys
4. **Authorization**: Permission-based access
5. **Rate Limiting**: API and login limits
6. **Input Validation**: Zod schemas
7. **IP Blocking**: Block suspicious IPs
8. **Audit Logging**: All actions logged

---

## Database Schema

### Core Models

- `Student` - Students
- `Cohort` - Student cohorts (by start year)
- `Class` - Classes (grade + parallel + track + academicYear)
- `Enrollment` - Student-class relationships
- `Soldier` - Users/Staff
- `Permission` - Permissions
- `AuditLog` - Activity logs

### Relationships

```
Student → Cohort
Student → Enrollment → Class
Soldier → UserPermission → Permission
Role → RolePermission → Permission
```

---

## Real-Time Communication

### WebSocket (SOC)

- Backend: `lib/soc/soc-websocket.ts`
- Frontend: `features/soc/useSOCWebSocket.ts`
- Used for: Real-time security monitoring

---

## Error Handling

### Backend

- Global error handler in `lib/utils/errors.ts`
- Custom error classes: `AppError`, `ValidationError`, `NotFoundError`
- All errors logged and returned with appropriate HTTP status

### Frontend

- Error boundaries for component errors
- API error handling via Axios interceptors
- Error pages: 403, 404, 500

---

## Logging

- **Backend**: Pino (structured JSON logs)
- **Audit Logging**: All actions logged to `AuditLog` table
- **SOC Monitoring**: Real-time security event monitoring

---

## Development Workflow

1. Create feature branch
2. Develop feature (backend + frontend)
3. Test locally
4. Commit and push
5. Create pull request

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for detailed setup and workflows.
