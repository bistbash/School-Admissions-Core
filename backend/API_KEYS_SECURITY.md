# API Keys Security Documentation

## Overview

The API Keys system is designed with maximum security in mind. This document outlines all security measures implemented to prevent any data leakage.

## Security Measures

### 1. Key Storage

- **Hashing**: All API keys are hashed using SHA-256 before storage
- **No Plain Text**: The plain key is NEVER stored in the database
- **One-Time Display**: Plain keys are only shown once during creation and never again

### 2. Key Generation

- **Cryptographically Secure**: Keys are generated using `crypto.randomBytes(32)` (256 bits of entropy)
- **Format**: Keys use the format `sk_` prefix followed by 64 hex characters
- **Uniqueness**: Each key is guaranteed to be unique

### 3. Authentication

- **Dual Support**: System supports both JWT tokens and API keys
- **Priority**: API keys are checked first, then JWT tokens
- **Header Support**: Keys can be sent via `X-API-Key` header or `Authorization: Bearer` header

### 4. Audit Logging Security

**CRITICAL**: API keys are NEVER logged in audit logs:

- ✅ Key creation is logged (without the key itself)
- ✅ Key usage is logged (without the key itself)
- ✅ Key revocation is logged (without the key itself)
- ✅ Failed authentication attempts are logged (without the key itself)
- ❌ The actual key value is NEVER stored in logs
- ❌ The key hash is NEVER stored in logs
- ❌ Any key-related data is sanitized before logging

### 5. Response Security

- **No Key in Responses**: API keys are never returned in GET requests
- **One-Time Creation Response**: Plain key is only returned once during creation
- **Sanitization**: All responses are sanitized to remove any key data

### 6. Database Security

- **Hashed Storage**: Only SHA-256 hashes are stored
- **No Plain Keys**: Plain keys never touch the database
- **Indexed Lookups**: Fast lookups without exposing keys

### 7. Middleware Security

- **Early Validation**: Keys are validated before any request processing
- **No Logging**: Middleware never logs key values
- **Error Handling**: Failed authentications don't expose key information

## Usage

### Creating an API Key

```bash
POST /api/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Production API Key",
  "expiresAt": "2026-12-31T23:59:59Z"  // Optional
}
```

**Response** (shown only once):
```json
{
  "message": "API key created successfully. Save this key - it will not be shown again!",
  "apiKey": {
    "id": 1,
    "key": "sk_abc123...",  // ⚠️ Save this immediately!
    "name": "Production API Key",
    "createdAt": "2025-12-07T10:00:00Z"
  },
  "warning": "This is the only time you will see this key. Store it securely."
}
```

### Using an API Key

```bash
# Option 1: X-API-Key header
curl -H "X-API-Key: sk_your_key_here" \
  http://localhost:3000/api/soldiers

# Option 2: Authorization header
curl -H "Authorization: Bearer sk_your_key_here" \
  http://localhost:3000/api/soldiers
```

### Viewing API Keys

**Your Keys:**
```bash
GET /api/api-keys
Authorization: Bearer <jwt_token>
```

**All Keys (Admin):**
```bash
GET /api/api-keys/all
Authorization: Bearer <jwt_token>
```

**Response** (no key values):
```json
[
  {
    "id": 1,
    "name": "Production API Key",
    "userId": 123,
    "lastUsedAt": "2025-12-07T10:00:00Z",
    "expiresAt": null,
    "isActive": true,
    "createdAt": "2025-12-07T09:00:00Z"
    // Note: No 'key' field - it's never returned
  }
]
```

## Security Best Practices

1. **Never Log Keys**: The system automatically prevents key logging
2. **Store Securely**: Users must store keys securely (not in code repositories)
3. **Rotate Regularly**: Revoke and recreate keys periodically
4. **Use Expiration**: Set expiration dates for keys
5. **Monitor Usage**: Check `lastUsedAt` to detect suspicious activity
6. **Revoke Immediately**: Revoke compromised keys immediately

## What is NEVER Logged

- ❌ Plain API key values
- ❌ API key hashes
- ❌ Partial API keys
- ❌ Key prefixes or suffixes
- ❌ Any identifiable key information

## What IS Logged (Safely)

- ✅ API key ID
- ✅ API key name
- ✅ Creation timestamp
- ✅ Last used timestamp
- ✅ Revocation events
- ✅ Authentication success/failure (without key)

## Implementation Details

### Key Hashing

```typescript
// Key is hashed immediately after generation
const key = generateAPIKey(); // "sk_abc123..."
const hashedKey = hashAPIKey(key); // SHA-256 hash
// Only hash is stored in database
```

### Verification

```typescript
// Verification compares hashes, never plain keys
const providedKey = req.headers['x-api-key'];
const hashedProvided = hashAPIKey(providedKey);
const storedHash = await prisma.apiKey.findUnique({...});
return hashedProvided === storedHash;
```

### Audit Logging

```typescript
// All audit logs explicitly exclude key data
await auditFromRequest(req, 'CREATE', 'AUDIT_LOG', {
  details: {
    apiKeyId: result.id,
    apiKeyName: result.name,
    // NEVER: result.key
  },
});
```

## Compliance

This implementation follows security best practices:
- ✅ No sensitive data in logs
- ✅ Cryptographic hashing
- ✅ Secure random generation
- ✅ One-time key display
- ✅ Comprehensive audit trail (without sensitive data)

