# Security

Security implementation and best practices.

---

## Authentication

### JWT Tokens
- Algorithm: HS256
- Expiration: 7 days (configurable)
- Secret: Required via `JWT_SECRET` environment variable
- Storage: Browser localStorage

### API Keys
- Format: `sk_<random-string>`
- Hashed with bcrypt before storage
- Can be revoked
- Tracked in audit logs

---

## Security Layers

1. **Helmet.js**: Security headers (XSS, clickjacking protection)
2. **CORS**: Cross-origin protection
3. **Rate Limiting**: API and login limits
4. **Input Validation**: Zod schemas
5. **IP Blocking**: Block suspicious IPs
6. **Audit Logging**: All actions logged

---

## Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Minimum Length**: 8 characters
- **Never Stored**: Passwords never stored in plain text
- **Never Returned**: Password fields excluded from API responses

---

## Best Practices

1. **Strong JWT Secret**: Generate with `openssl rand -base64 32`
2. **HTTPS**: Always use HTTPS in production
3. **Environment Variables**: Never commit secrets
4. **Input Validation**: Validate all inputs
5. **Error Messages**: Don't leak sensitive information

---

## API Security

- All endpoints require authentication (except public)
- Permission-based access control
- Admin users get full access automatically
- Rate limiting prevents abuse

---

## Database Security

- Passwords hashed before storage
- Unique constraints (email, ID numbers)
- Transactions for data consistency
- Audit logging for all changes
