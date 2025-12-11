# Permissions System

Enterprise-level permissions system with page-based and API permissions.

---

## Overview

- **Page Permissions**: `page:pageName:view` or `page:pageName:edit`
- **API Permissions**: `resource:action` (e.g., `students:read`)

When granting page permission, all related API permissions are automatically granted.

---

## Features

### Page-Based Permissions
- Permissions defined at page level
- Automatic API permission granting
- Supports view and edit modes

### Role and User Permissions
- Grant to individual users
- Grant to roles (all users with role get permissions)
- Direct user permissions take precedence

### Frontend Integration
- `PermissionGuard` component protects routes
- Permission management UI for admins

---

## Architecture

### Permission Registry
All pages defined in `backend/src/lib/permissions/permission-registry.ts`:

```typescript
{
  'students': {
    page: 'students',
    viewAPIs: [{ resource: 'students', action: 'read', ... }],
    editAPIs: [{ resource: 'students', action: 'create', ... }]
  }
}
```

### Permission Service
- `grantPagePermission()` - Grants page + API permissions
- `revokePagePermission()` - Revokes page + API permissions
- `getUserPagePermissions()` - Gets user's permissions

---

## Usage

### Granting Permissions

```typescript
// Grant page permission to user
POST /api/permissions/users/:userId/grant-page
{ "page": "students", "action": "view" }

// Grant page permission to role
POST /api/permissions/roles/:roleId/grant-page
{ "page": "students", "action": "edit" }
```

### Checking Permissions (Frontend)

```tsx
const { hasPagePermission } = usePermissions();
const canView = hasPagePermission('students', 'view');
const canEdit = hasPagePermission('students', 'edit');
```

### Protecting Routes (Frontend)

```tsx
<PermissionGuard page="students" pageAction="view">
  <StudentsPage />
</PermissionGuard>
```

### Protecting API Routes (Backend)

```typescript
router.get(
  '/',
  requireResourcePagePermission('students', 'read'),
  controller.getAll
);
```

---

## Admin Access

Admins (`isAdmin: true`) automatically get full access to all endpoints without explicit permissions.
