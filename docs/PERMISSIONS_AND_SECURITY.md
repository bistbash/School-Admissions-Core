# Permissions & Security

How the permission system and security layers work.

---

## Permission System

### Types

1. **Page Permissions**: `page:pageName:view` or `page:pageName:edit`
2. **API Permissions**: `resource:action` (e.g., `students:read`)

### How It Works

1. User requests endpoint
2. Authentication middleware verifies JWT/API key
3. Permission middleware checks:
   - Is admin? → Full access
   - Has page permission? → Check if API is included
   - Has direct API permission? → Allow
4. If no permission → 403 Forbidden

### Permission Registry

All pages defined in `backend/src/lib/permissions/permission-registry.ts`:

```typescript
{
  'students': {
    page: 'students',
    viewAPIs: [
      { resource: 'students', action: 'read', method: 'GET', path: '/api/students' }
    ],
    editAPIs: [
      { resource: 'students', action: 'create', method: 'POST', path: '/api/students' }
    ]
  }
}
```

When granting `page:students:view`, all `viewAPIs` are automatically granted.

---

## Security Layers

### 1. Authentication

- **JWT Tokens**: For frontend users
- **API Keys**: For external applications
- Middleware: `lib/auth/auth.ts`

### 2. Authorization

- Permission-based access control
- Admin users get full access automatically
- Middleware: `lib/permissions/api-permission-middleware.ts`

### 3. Rate Limiting

- API: 5000 requests per 15 minutes
- Login: 5 failed attempts per 15 minutes
- File upload: 5 uploads per hour (regular users)

### 4. Input Validation

- Zod schemas for all inputs
- Prevents SQL injection, XSS attacks

### 5. IP Blocking

- Block suspicious IPs
- SOC can block IPs automatically
- Middleware: `lib/security/ipBlocking.ts`

### 6. Audit Logging

- All actions logged to `AuditLog` table
- Includes: user, action, resource, IP, timestamp
- SOC monitoring for anomalies

---

## Adding New Permissions

### 1. Define Page in Registry

```typescript
// backend/src/lib/permissions/permission-registry.ts
'my-page': {
  page: 'my-page',
  viewAPIs: [
    { resource: 'my-resource', action: 'read', method: 'GET', path: '/api/my-resource' }
  ],
  editAPIs: [
    { resource: 'my-resource', action: 'create', method: 'POST', path: '/api/my-resource' }
  ]
}
```

### 2. Seed Permissions

```bash
npm run seed-permissions
```

### 3. Protect Routes

```typescript
router.get(
  '/',
  requireResourcePagePermission('my-resource', 'read'),
  controller.getAll
);
```

### 4. Protect Frontend

```tsx
<PermissionGuard page="my-page" pageAction="view">
  <MyPage />
</PermissionGuard>
```

---

## Best Practices

1. Always use page permissions (auto-grants API permissions)
2. Check permissions in both frontend and backend
3. Validate all inputs with Zod
4. Log important actions
5. Use transactions for multiple database operations
