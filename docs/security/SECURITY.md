# Security Implementation

This document outlines the security measures implemented in the School Admissions Core application.

## Authentication & Authorization

### Password Security
- **Hashing**: Passwords are hashed using `bcrypt` with 12 salt rounds
- **Minimum Length**: Passwords must be at least 8 characters
- **Storage**: Passwords are never stored in plain text
- **Never Returned**: Password fields are explicitly excluded from all API responses

### JWT Tokens
- **Algorithm**: HS256 (HMAC SHA-256)
- **Expiration**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Secret**: Must be set via `JWT_SECRET` environment variable
- **Storage**: Tokens stored in browser localStorage (consider httpOnly cookies for production)

### Protected Routes
- All `/api/soldiers/*` routes require authentication
- Authentication middleware validates JWT tokens on every request
- Invalid or expired tokens result in 401 Unauthorized

## Security Best Practices

### Environment Variables
**CRITICAL**: Set a strong `JWT_SECRET` in production:
```bash
# Generate a secure secret:
openssl rand -base64 32

# Set in .env:
JWT_SECRET=your-generated-secret-here
```

### Password Requirements
- Minimum 8 characters
- Should include uppercase, lowercase, numbers, and special characters (enforced in frontend validation)

### API Security
- CORS configured to only allow frontend origin
- Input validation using Zod schemas
- SQL injection protection via Prisma ORM
- Error messages don't leak sensitive information

### Database Security
- Passwords are hashed before storage
- Email addresses are unique (prevent duplicate accounts)
- Personal numbers are unique (prevent duplicate registrations)

## Security Recommendations for Production

1. **Use HTTPS**: Always use HTTPS in production
2. **Strong JWT Secret**: Generate a cryptographically secure secret (minimum 32 characters)
3. **Token Refresh**: Implement token refresh mechanism
4. **Rate Limiting**: Add rate limiting to prevent brute force attacks
5. **Password Reset**: Implement secure password reset flow
6. **Email Verification**: Add email verification for new registrations
7. **Session Management**: Consider using httpOnly cookies instead of localStorage
8. **CSP Headers**: Add Content Security Policy headers
9. **Helmet.js**: Use Helmet.js for additional security headers
10. **Audit Logging**: Log authentication attempts and security events
11. **2FA**: Consider two-factor authentication for sensitive operations
12. **Database Encryption**: Encrypt sensitive data at rest
13. **Regular Updates**: Keep all dependencies updated

## Current Security Features

✅ Password hashing with bcrypt (12 rounds)
✅ JWT token authentication
✅ Protected API routes
✅ Input validation
✅ CORS configuration
✅ Error handling without information leakage
✅ Unique email and personal number constraints
✅ Password exclusion from responses

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/departments` - Get departments (public)
- `GET /api/roles` - Get roles (public)
- `GET /api/rooms` - Get rooms (public)

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Get current user info
- All `/api/soldiers/*` routes

## Token Usage

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-token-here>
```

The frontend automatically includes this token in all API requests.



