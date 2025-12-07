# Troubleshooting Guide

## "No token provided" Error

This error occurs when trying to access a protected route without authentication.

### Common Causes:

1. **Not logged in** - You need to register/login first
2. **Token expired** - Token may have expired (7 days default)
3. **Token not stored** - Token wasn't saved properly after login
4. **Direct API access** - Trying to access protected endpoints directly

### Solutions:

#### 1. Check if you're logged in
- Open browser DevTools (F12)
- Go to Application/Storage tab
- Check Local Storage for `auth_token`
- If missing, you need to login

#### 2. Clear and re-login
```javascript
// In browser console:
localStorage.removeItem('auth_token');
// Then refresh and login again
```

#### 3. Verify token is being sent
- Open Network tab in DevTools
- Make a request to a protected endpoint
- Check Request Headers
- Should see: `Authorization: Bearer <token>`

#### 4. Check backend is running
```bash
cd backend
npm run dev
```

#### 5. Verify JWT_SECRET is set
```bash
cd backend
# Check .env file has:
JWT_SECRET=your-secret-here
```

### Quick Fix Steps:

1. **Clear browser storage:**
   - Open DevTools (F12)
   - Application tab → Local Storage
   - Delete `auth_token`
   - Refresh page

2. **Register/Login:**
   - Click "הירשם כאן" (Register here) or use login form
   - Fill in all required fields
   - After successful login, token will be stored

3. **Check backend logs:**
   - Look for authentication errors
   - Verify JWT_SECRET is set
   - Check that routes are properly configured

### Protected vs Public Routes:

**Public (No auth required):**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/departments` (for registration form)
- `GET /api/roles` (for registration form)

**Protected (Auth required):**
- `GET /api/auth/me`
- All `/api/soldiers/*` routes

### Still Having Issues?

1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify backend is running on port 3000
4. Check that CORS is configured correctly
5. Ensure JWT_SECRET is set in backend `.env`



