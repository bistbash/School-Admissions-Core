# Trusted Users Whitelist

System for whitelisting trusted users (developers, admins) for higher limits.

---

## Benefits

- **Higher rate limits**: Exempt from API rate limiting
- **Larger file uploads**: 200MB (instead of 10MB)
- **More uploads**: 100/hour (instead of 5/hour)
- **IP blocking exemption**: Never blocked automatically

---

## Adding Trusted Users

### By User ID

```bash
POST /api/soc/trusted-users
{
  "userId": 1,
  "name": "Developer",
  "reason": "Developer - needs higher limits"
}
```

### By IP Address

```bash
POST /api/soc/trusted-users
{
  "ipAddress": "192.168.1.100",
  "name": "Office IP",
  "reason": "Office network"
}
```

### By Email

```bash
POST /api/soc/trusted-users
{
  "email": "developer@example.com",
  "name": "Developer",
  "reason": "Developer account"
}
```

---

## Limits Comparison

| Feature | Regular | Trusted |
|---------|---------|---------|
| API Rate Limit | 5000/15min | Unlimited |
| File Upload Size | 10MB | 200MB |
| Uploads/Hour | 5 | 100 |
| IP Blocking | Can be blocked | Never blocked |

---

## Best Practices

1. Set expiration dates
2. Provide clear reason
3. Review regularly
4. Remove inactive users

---

## API Endpoints

- `GET /api/soc/trusted-users` - List all
- `POST /api/soc/trusted-users` - Add new
- `DELETE /api/soc/trusted-users/:id` - Remove

**Permissions:** Admin only
