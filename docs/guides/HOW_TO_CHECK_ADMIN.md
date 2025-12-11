# How to Check if User is Admin

---

## Frontend

```typescript
const response = await apiClient.get('/auth/me');
const isAdmin = response.data.isAdmin;
```

---

## Backend

```typescript
const user = await prisma.soldier.findUnique({
  where: { id: userId },
  select: { isAdmin: true },
});

const isAdmin = user?.isAdmin || false;
```

---

## Using Middleware

```typescript
import { requireAdmin } from '../../lib/security';

router.post('/endpoint', requireAdmin, controller.method);
```

---

## Notes

- First registered user automatically becomes admin
- Admin status is checked from database (not JWT)
- Admins have full access to all endpoints
- Admin status cannot be spoofed
