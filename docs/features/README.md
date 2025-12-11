# Features Documentation

System features documentation.

---

## Files

- **[ADMIN_SYSTEM.md](./ADMIN_SYSTEM.md)** - Admin system
- **[PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)** - Permissions system
- **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md)** - Audit logging and SOC
- **[COHORTS_API.md](./COHORTS_API.md)** - Cohorts API

---

## Quick Reference

### Admin System
```typescript
const user = await apiClient.get('/auth/me');
if (user.data.isAdmin) { /* admin features */ }
```

### Permissions
```typescript
const { hasPagePermission } = usePermissions();
if (hasPagePermission('students', 'view')) { /* show page */ }
```

### Cohorts
```typescript
const cohorts = await apiClient.get('/cohorts?isActive=true');
```
