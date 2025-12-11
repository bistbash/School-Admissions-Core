# Rate Limiting

Rate limiting protects the system from abuse and ensures fair resource usage.

---

## Limits

### API Rate Limiting
- **Regular users**: 5000 requests per 15 minutes
- **Trusted users**: Exempt from rate limiting
- **Admins**: Exempt from rate limiting

### Login Rate Limiting
- **Regular users**: 5 failed attempts per 15 minutes
- **Trusted users**: 20 failed attempts per 15 minutes
- **Admins**: 50 failed attempts per 15 minutes
- Only failed attempts are counted

### File Upload Rate Limiting
- **Regular users**: 5 uploads per hour
- **Trusted users**: 100 uploads per hour
- **Admins**: 1000 uploads per hour (effectively unlimited)

---

## Trusted Users

Trusted users get higher limits and exemptions:
- Exempt from API rate limiting
- Higher login attempt limits
- Higher file upload limits
- Never blocked by IP blocking

Admins can add users to trusted list via SOC interface.

---

## Error Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

HTTP Status: `429 Too Many Requests`

---

## Best Practices

1. Use trusted user status for developers
2. Implement retry logic with exponential backoff
3. Cache responses when possible
4. Batch requests when possible
