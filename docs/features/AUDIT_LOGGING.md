# Audit Logging

Comprehensive audit logging and SOC API for security monitoring.

---

## Overview

All API requests are automatically logged to the `AuditLog` table for security monitoring and compliance.

---

## Audit Actions

- `LOGIN` - Successful login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt
- `CREATE` - Resource creation
- `UPDATE` - Resource update
- `DELETE` - Resource deletion
- `READ` - Resource read
- `AUTH_FAILED` - Authentication failure
- `UNAUTHORIZED_ACCESS` - Unauthorized access attempt

---

## Audit Log Fields

- `userId` - User who performed action
- `action` - Action type
- `resource` - Resource type
- `resourceId` - ID of affected resource
- `ipAddress` - Client IP
- `userAgent` - Client user agent
- `status` - SUCCESS, FAILURE, ERROR
- `createdAt` - Timestamp

---

## SOC API

### Get Audit Logs

```bash
GET /api/soc/audit-logs?action=LOGIN_FAILED&status=FAILURE&limit=50
```

**Query Parameters:**
- `userId`, `action`, `resource`, `status`
- `startDate`, `endDate`
- `limit`, `offset`

**Permissions:** `soc:read` or `page:soc:view`

### Get Security Statistics

```bash
GET /api/soc/stats
```

Returns: total logs, success/failure counts, unique users/IPs

**Permissions:** `soc:read` or `page:soc:view`

### Update Incident

```bash
PUT /api/soc/incidents/:id
{
  "incidentStatus": "RESOLVED",
  "priority": "HIGH"
}
```

**Permissions:** `soc:update` or `page:soc:edit`

---

## Real-Time Monitoring

WebSocket connection for real-time security events:

- Backend: `lib/soc/soc-websocket.ts`
- Frontend: `features/soc/useSOCWebSocket.ts`

---

## Anomaly Detection

Automatic detection of:
- Unusual activity patterns
- Brute force attempts
- Multiple failed logins
- Suspicious IP addresses

Location: `lib/soc/anomaly-detection.ts`
