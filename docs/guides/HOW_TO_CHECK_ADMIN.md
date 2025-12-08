# How to Check if User is Admin

## Overview

יש כמה דרכים לבדוק אם משתמש הוא admin במערכת.

## Method 1: Frontend - Using `/api/auth/me` Endpoint

### Step 1: Call the API

```typescript
// In your React component
import { apiClient } from '../lib/api';

const checkIfAdmin = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    const user = response.data;
    
    if (user.isAdmin) {
      console.log('User is admin!');
      return true;
    } else {
      console.log('User is not admin');
      return false;
    }
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
};
```

### Step 2: Use in Component

```typescript
// Example: Show admin features only to admins
function MyComponent() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setIsAdmin(response.data.isAdmin || false);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAdmin && (
        <button>Admin Only Feature</button>
      )}
    </div>
  );
}
```

## Method 2: Backend - In Middleware/Controller

### Check in Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ForbiddenError } from '../lib/errors';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const apiKey = (req as any).apiKey;
    
    if (!user && !apiKey) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = user?.userId || apiKey?.userId;
    
    if (!userId) {
      throw new UnauthorizedError('User ID not found');
    }

    // Check if user is admin
    const soldier = await prisma.soldier.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!soldier || !soldier.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
```

### Check in Controller

```typescript
export class MyController {
  async someMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if admin
      const soldier = await prisma.soldier.findUnique({
        where: { id: user.userId },
        select: { isAdmin: true },
      });

      const isAdmin = soldier?.isAdmin || false;

      if (isAdmin) {
        // Admin logic
      } else {
        // Regular user logic
      }

      res.json({ isAdmin });
    } catch (error) {
      next(error);
    }
  }
}
```

## Method 3: Using cURL/HTTP Request

### Check via API

```bash
# Get your JWT token first (from login)
TOKEN="your-jwt-token-here"

# Check if admin
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Response will include:
# {
#   "id": 1,
#   "email": "admin@example.com",
#   "isAdmin": true,
#   ...
# }
```

## Method 4: Direct Database Query

### SQL Query

```sql
-- Check if user is admin
SELECT id, email, name, isAdmin 
FROM Soldier 
WHERE id = 1;

-- Find all admins
SELECT id, email, name, isAdmin, createdAt
FROM Soldier 
WHERE isAdmin = 1;
```

### Prisma Query (Backend)

```typescript
import { prisma } from '../lib/prisma';

// Check specific user
const user = await prisma.soldier.findUnique({
  where: { id: userId },
  select: { isAdmin: true },
});

const isAdmin = user?.isAdmin || false;

// Find all admins
const admins = await prisma.soldier.findMany({
  where: { isAdmin: true },
  select: {
    id: true,
    email: true,
    name: true,
    createdAt: true,
  },
});
```

## API Response Format

### `/api/auth/me` Response

```json
{
  "id": 1,
  "personalNumber": "123456789",
  "name": "Admin User",
  "email": "admin@example.com",
  "type": "PERMANENT",
  "departmentId": 1,
  "roleId": 1,
  "isCommander": false,
  "isAdmin": true,
  "department": {
    "id": 1,
    "name": "IT Department"
  },
  "role": {
    "id": 1,
    "name": "Developer"
  },
  "createdAt": "2025-12-07T10:00:00.000Z",
  "updatedAt": "2025-12-07T10:00:00.000Z"
}
```

### Login Response (also includes isAdmin)

```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "isAdmin": true,
    ...
  }
}
```

## Frontend Helper Function

Create a utility function:

```typescript
// frontend/src/lib/auth.ts
import { apiClient } from './api';

let cachedUser: any = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getUserInfo = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached user if still valid
  if (!forceRefresh && cachedUser && (now - cacheTime) < CACHE_DURATION) {
    return cachedUser;
  }

  try {
    const response = await apiClient.get('/auth/me');
    cachedUser = response.data;
    cacheTime = now;
    return cachedUser;
  } catch (error) {
    cachedUser = null;
    cacheTime = 0;
    throw error;
  }
};

export const isAdmin = async (): Promise<boolean> => {
  try {
    const user = await getUserInfo();
    return user?.isAdmin || false;
  } catch (error) {
    return false;
  }
};

// Usage in component
const user = await getUserInfo();
if (user.isAdmin) {
  // Show admin features
}
```

## React Hook Example

```typescript
// frontend/src/hooks/useAdmin.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setIsAdmin(response.data.isAdmin || false);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}

// Usage
function MyComponent() {
  const { isAdmin, loading } = useAdmin();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAdmin && <AdminPanel />}
      <RegularContent />
    </div>
  );
}
```

## Important Notes

1. **Admin Status is in Database**: `isAdmin` is stored in the `Soldier` table, not in the JWT token
2. **First User is Admin**: The first registered user automatically becomes admin
3. **Only One Admin**: Currently, only the first user can be admin (by design)
4. **Check on Every Request**: For security, admin status is checked from the database on each request
5. **Cache in Frontend**: You can cache the user info in frontend, but refresh periodically

## Security Considerations

- ✅ Admin status is checked from database (not from JWT)
- ✅ Cannot be spoofed by modifying JWT token
- ✅ All admin endpoints use `requireAdmin` middleware
- ✅ Failed admin access attempts are logged

## Troubleshooting

### "isAdmin is undefined"
- Make sure you're calling `/api/auth/me` after login
- Check that the backend includes `isAdmin` in the response
- Verify the user is authenticated

### "User is not admin but should be"
- Check database: `SELECT isAdmin FROM Soldier WHERE id = ?`
- Only the first registered user is admin automatically
- To make another user admin, update database directly:
  ```sql
  UPDATE Soldier SET isAdmin = 1 WHERE id = ?;
  ```

### "Cannot access admin endpoints"
- Verify `isAdmin = true` in database
- Check that you're using the correct user account
- Ensure the JWT token is valid and not expired
