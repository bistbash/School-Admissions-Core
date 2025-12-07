# Authentication System Implementation

## Overview

The soldiers database has been converted to a secure user authentication system with password hashing and JWT tokens.

## What Changed

### Database Schema
- Added `email` field (unique) to Soldier model
- Added `password` field (hashed) to Soldier model
- Added `createdAt` and `updatedAt` timestamps
- Migration created: `20251207095227_add_auth_to_soldiers`

### Backend Security Features

1. **Password Hashing**
   - Uses `bcrypt` with 12 salt rounds
   - Passwords are never stored in plain text
   - Passwords are never returned in API responses

2. **JWT Authentication**
   - Tokens expire after 7 days (configurable)
   - Secret key must be set via `JWT_SECRET` environment variable
   - Tokens include: userId, personalNumber, email

3. **Protected Routes**
   - All `/api/soldiers/*` routes require authentication
   - Authentication middleware validates tokens on every request

4. **New Endpoints**
   - `POST /api/auth/register` - Register new user
   - `POST /api/auth/login` - Login user
   - `GET /api/auth/me` - Get current user (protected)

### Frontend Features

1. **Login/Register Forms**
   - Beautiful Hebrew UI with RTL support
   - Form validation
   - Error handling

2. **Token Management**
   - Tokens stored in localStorage
   - Automatically included in all API requests
   - Auto-logout on 401 errors

3. **Protected UI**
   - Main app requires authentication
   - Logout button in header
   - Seamless authentication flow

## Security Measures

✅ **Password Security**
- Minimum 8 characters required
- Bcrypt hashing (12 rounds)
- Never returned in responses
- Never logged

✅ **Token Security**
- JWT with expiration
- Secret key required
- Validated on every protected request

✅ **API Security**
- Protected routes require valid tokens
- CORS configured
- Input validation
- Error messages don't leak info

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies (already done)
npm install

# Set up environment variables
cp .env.example .env

# IMPORTANT: Generate and set JWT_SECRET
# Generate secret:
openssl rand -base64 32

# Edit .env and add:
JWT_SECRET=your-generated-secret-here

# Run migration (already done)
npx prisma migrate dev
```

### 2. Frontend Setup

No additional setup needed - authentication is built in!

### 3. Using the System

1. **Register a new user:**
   - Click "הירשם כאן" (Register here)
   - Fill in all required fields
   - Password must be at least 8 characters
   - Email must be unique

2. **Login:**
   - Enter email and password
   - Token is stored automatically
   - You'll be redirected to the main app

3. **Access protected resources:**
   - All soldier management requires authentication
   - Token is automatically included in requests

## API Usage Examples

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "personalNumber": "123456",
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123",
    "type": "PERMANENT",
    "departmentId": 1,
    "roleId": 1,
    "isCommander": false
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### Access Protected Route
```bash
curl -X GET http://localhost:3000/api/soldiers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Important Notes

⚠️ **Password Field in Soldiers Form**
- The soldiers form includes a password field, but creating soldiers through `/api/soldiers` will NOT hash the password
- **Always use `/api/auth/register` for creating new users with passwords**
- The password field in the soldiers form is for reference only

⚠️ **JWT Secret**
- **CRITICAL**: Change `JWT_SECRET` in production!
- Use a strong, random secret (minimum 32 characters)
- Never commit secrets to version control

⚠️ **Existing Data**
- Existing soldiers in the database will need to be updated with emails and passwords
- You can either:
  1. Register them through the UI
  2. Manually update the database (password must be hashed)

## Security Recommendations

See `backend/SECURITY.md` for detailed security recommendations and best practices.

## Testing

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173`
4. Register a new user
5. Login with your credentials
6. Access protected resources

## Troubleshooting

**"Unauthorized" errors:**
- Check that you're logged in
- Verify token is in localStorage
- Check that JWT_SECRET is set

**"Email already exists":**
- Email must be unique
- Use a different email or update existing user

**"Invalid email or password":**
- Verify email and password are correct
- Check that user exists in database



