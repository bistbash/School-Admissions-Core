# Enterprise Permissions System

## Overview

This document describes the enterprise-level permissions system implemented for the School Admissions Core application. The system provides a comprehensive, scalable approach to managing permissions at both the page and API level.

## Key Features

### 1. Page-Based Permissions
- Permissions are defined at the page level (view/edit)
- When a user gets permission for a page, they automatically receive permissions for the corresponding APIs
- Supports both view and edit permissions
- Admin-only pages can be marked to restrict editing to administrators only

### 2. Automatic API Permission Granting
- When granting page permissions, the system automatically grants all related API permissions
- This ensures consistency and reduces manual permission management
- API permissions are organized by resource and action (e.g., `students:read`, `students:create`)

### 3. Role and User Permissions
- Permissions can be granted to:
  - Individual users (direct permissions)
  - Roles (all users with the role get the permissions)
- Users inherit permissions from their roles
- Direct user permissions take precedence

### 4. Frontend Integration
- Permission checks are integrated into the frontend routing
- `PermissionGuard` component protects routes based on page permissions
- Permission management UI allows admins to manage permissions visually

## Architecture

### Backend

#### Permission Registry (`backend/src/lib/permissions/permission-registry.ts`)
Defines all pages and their associated API endpoints:

```typescript
{
  'students': {
    page: 'students',
    displayName: 'Students',
    description: 'Manage students',
    category: 'academic',
    viewAPIs: [...],
    editAPIs: [...],
    adminOnly: true
  }
}
```

#### Permission Service (`backend/src/modules/permissions/permissions.service.ts`)
- `grantPagePermission()` - Grants page permission and automatically grants API permissions
- `revokePagePermission()` - Revokes page permission and automatically revokes API permissions
- `getUserPagePermissions()` - Gets all page permissions for a user
- `grantPagePermissionToRole()` - Grants page permission to a role

#### Permission Middleware (`backend/src/lib/permissions/permission-middleware.ts`)
- `requirePermission` - Middleware to check API permissions automatically
- `requireResourcePermission` - Middleware for specific resource/action checks

### Frontend

#### Permissions Context (`frontend/src/features/permissions/PermissionsContext.tsx`)
- Provides permission state to all components
- `hasPagePermission(page, action)` - Check if user has page permission
- `hasResourcePermission(resource, action)` - Check if user has API permission

#### Permission Guard (`frontend/src/features/permissions/PermissionGuard.tsx`)
- Protects routes based on page permissions
- Usage: `<PermissionGuard page="students" pageAction="view">...</PermissionGuard>`

#### Page Permissions Manager (`frontend/src/features/permissions/PagePermissionsManager.tsx`)
- UI for managing page-based permissions
- Shows all pages organized by category
- Allows granting/revoking view and edit permissions
- Shows which APIs are automatically granted

## Database Schema

The system uses the existing permission tables:
- `Permission` - Stores all permissions (page and API)
- `UserPermission` - Links users to permissions
- `RolePermission` - Links roles to permissions

Page permissions are stored with the format:
- `page:students:view` - View permission for students page
- `page:students:edit` - Edit permission for students page

## Usage

### Seeding Permissions

Run the seed script to initialize all permissions:

```bash
cd backend
npm run seed-permissions
```

### Granting Page Permissions (Backend)

```typescript
// Grant view permission to user
await permissionsService.grantPagePermission(userId, 'students', 'view', adminUserId);

// Grant edit permission to role
await permissionsService.grantPagePermissionToRole(roleId, 'students', 'edit', adminUserId);
```

### Checking Permissions (Frontend)

```typescript
// In a component
const { hasPagePermission } = usePermissions();
const canView = hasPagePermission('students', 'view');
const canEdit = hasPagePermission('students', 'edit');
```

### Protecting Routes (Frontend)

```typescript
<Route 
  path="students" 
  element={
    <PermissionGuard page="students" pageAction="view" fallback={<Error403Page />}>
      <StudentsPage />
    </PermissionGuard>
  } 
/>
```

### Protecting API Routes (Backend)

```typescript
// Automatic permission check based on route
router.get('/students', authenticate, requirePermission, controller.getAll);

// Specific permission check
router.post('/students', authenticate, requireResourcePermission('students', 'create'), controller.create);
```

## Page Registry

All available pages are defined in `permission-registry.ts`:

- **Dashboard** - View dashboard
- **Students** - Manage students (admin only)
- **Cohorts** - Manage cohorts (admin only)
- **Classes** - Manage classes (admin only)
- **Student Exits** - Manage student exits (admin only)
- **Users** - Manage users (admin only)
- **Departments** - Manage departments (admin only)
- **Roles** - Manage roles (admin only)
- **Rooms** - Manage rooms (admin only)
- **Permissions** - Manage permissions (admin only)
- **SOC** - Security operations center (admin only)
- **API Keys** - Manage API keys (admin only)
- **Resources** - View resources
- **Search** - Search functionality

## Admin-Only Pages

The following pages are marked as `adminOnly: true`, meaning only administrators can edit them:
- Students
- Cohorts
- Classes
- Student Exits
- Users
- Departments
- Roles
- Rooms
- Permissions
- SOC
- API Keys

## API Endpoints

### Get All Page Permissions
```
GET /api/permissions/pages
```

### Get User's Page Permissions
```
GET /api/permissions/my-page-permissions
GET /api/permissions/users/:userId/page-permissions
```

### Grant Page Permission
```
POST /api/permissions/users/:userId/grant-page
Body: { page: 'students', action: 'view' }
```

### Revoke Page Permission
```
POST /api/permissions/users/:userId/revoke-page
Body: { page: 'students', action: 'view' }
```

### Grant Page Permission to Role
```
POST /api/permissions/roles/:roleId/grant-page
Body: { page: 'students', action: 'view' }
```

## Best Practices

1. **Always use page permissions for frontend routes** - This ensures consistency and automatic API permission management
2. **Use admin-only flag for sensitive pages** - Prevents accidental permission grants
3. **Grant permissions to roles when possible** - Easier to manage than individual user permissions
4. **Run seed script after schema changes** - Ensures all permissions exist in the database
5. **Use PermissionGuard for all protected routes** - Provides consistent access control

## Migration Guide

If you have existing permissions, they will continue to work. The new page-based system is additive:

1. Run the seed script to create all page and API permissions
2. Grant page permissions to users/roles as needed
3. Update frontend routes to use `PermissionGuard` with page permissions
4. Existing API permissions will continue to work alongside page permissions

## Security Considerations

1. **Admin-only enforcement** - The system enforces admin-only restrictions at both the service and UI level
2. **Automatic API permission management** - Reduces risk of inconsistent permissions
3. **Audit logging** - All permission changes are logged
4. **Role-based access** - Permissions can be managed at the role level for easier administration
