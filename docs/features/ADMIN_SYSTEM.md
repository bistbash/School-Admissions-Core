# Admin System

How the admin system works.

---

## Admin Creation

The first registered user automatically becomes admin (`isAdmin: true`).

---

## Admin Privileges

- Full access to all endpoints (bypasses permission checks)
- Can manage users (create, approve, reject, delete)
- Can manage permissions
- Can access all pages and APIs

---

## Admin Endpoints

### User Management

```bash
POST /api/auth/create-user      # Create new user
POST /api/auth/:id/approve     # Approve user
POST /api/auth/:id/reject      # Reject user
GET  /api/auth/created         # Get created users
GET  /api/auth/pending         # Get pending users
```

### Permission Management

```bash
POST /api/permissions/users/:userId/grant-page
POST /api/permissions/roles/:roleId/grant-page
```

---

## Checking Admin Status

### Backend

```typescript
if (user.isAdmin) {
  // Admin access
}
```

### Frontend

```tsx
const { user } = useAuth();
if (user?.isAdmin) {
  // Admin features
}
```

---

## Security

- Admin status is checked in permission middleware
- Admin users bypass all permission checks
- All admin actions are logged to audit log
