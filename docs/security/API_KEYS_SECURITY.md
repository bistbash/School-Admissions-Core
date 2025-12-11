# API Keys Security

Security measures for API keys.

---

## Security Features

### Key Storage
- **Hashing**: SHA-256 before storage
- **No Plain Text**: Plain keys never stored
- **One-Time Display**: Shown only once during creation

### Key Generation
- **Cryptographically Secure**: `crypto.randomBytes(32)` (256 bits)
- **Format**: `sk_` prefix + 64 hex characters
- **Uniqueness**: Each key is unique

### Authentication
- Supports both JWT tokens and API keys
- API keys checked first, then JWT tokens
- Can be sent via `X-API-Key` header or `Authorization: Bearer`

### Audit Logging
- **NEVER logs**: Actual key values, key hashes, or key-related data
- **Logs**: Key creation, usage, revocation (without key itself)

---

## Usage

### Create API Key

```bash
POST /api/api-keys
{
  "name": "Production API Key",
  "expiresAt": "2026-12-31T23:59:59Z"  // Optional
}
```

**Response** (shown only once):
```json
{
  "apiKey": {
    "id": 1,
    "key": "sk_abc123...",  // ⚠️ Save immediately!
    "name": "Production API Key"
  },
  "warning": "This is the only time you will see this key."
}
```

### Use API Key

```bash
# Option 1: X-API-Key header
curl -H "X-API-Key: sk_your_key" http://localhost:3000/api/students

# Option 2: Authorization header
curl -H "Authorization: Bearer sk_your_key" http://localhost:3000/api/students
```

---

## Best Practices

1. **Save key immediately** - Only shown once
2. **Store securely** - Use secrets management
3. **Set expiration** - Always set expiration date
4. **Rotate regularly** - Create new keys periodically
5. **Revoke unused** - Delete unused keys

---

## Security Notes

- Keys are hashed with SHA-256 before storage
- Plain keys never appear in logs or responses (except creation)
- Keys can be revoked at any time
- Expired keys are automatically invalid
