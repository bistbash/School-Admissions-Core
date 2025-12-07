# Audit Logging & SOC API Documentation

## Overview

The system includes comprehensive audit logging and a Security Operations Center (SOC) API for monitoring, security analysis, and compliance.

## Features

### Audit Logging

- **Automatic logging** of all API requests
- **Authentication events** (login, logout, failed attempts)
- **Data access tracking** (who accessed what, when)
- **Data modifications** (create, update, delete operations)
- **Security events** (unauthorized access, token expiration)
- **IP address and user agent** tracking
- **Error tracking** with detailed error messages

### SOC API

- **Query audit logs** with advanced filtering
- **Security statistics** and analytics
- **Security alerts** (failed logins, unauthorized access)
- **User activity** tracking
- **Resource history** (complete audit trail for any resource)

## Database Schema

### AuditLog Model

```prisma
model AuditLog {
  id          Int       @id @default(autoincrement())
  userId      Int?      // User who performed the action
  userEmail   String?   // Email for quick reference
  action      String    // Action type
  resource    String    // Resource type
  resourceId  Int?      // ID of affected resource
  details     String?   // JSON with additional details
  ipAddress   String?   // Client IP
  userAgent   String?   // Client user agent
  status      String    // SUCCESS, FAILURE, ERROR
  errorMessage String?  // Error details
  createdAt   DateTime  @default(now())
}
```

## Audit Actions

- `LOGIN` - Successful login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt
- `REGISTER` - User registration
- `CREATE` - Resource creation
- `UPDATE` - Resource update
- `DELETE` - Resource deletion
- `READ` - Single resource read
- `READ_LIST` - List operation
- `AUTH_FAILED` - Authentication failure
- `TOKEN_EXPIRED` - Expired token
- `UNAUTHORIZED_ACCESS` - Unauthorized access attempt

## Audit Resources

- `AUTH` - Authentication operations
- `SOLDIER` - Soldier records
- `DEPARTMENT` - Department records
- `ROLE` - Role records
- `ROOM` - Room records
- `AUDIT_LOG` - Audit log access
- `SYSTEM` - System operations

## SOC API Endpoints

All SOC endpoints require authentication.

### Get Audit Logs

```http
GET /api/soc/audit-logs
```

**Query Parameters:**
- `userId` (number) - Filter by user ID
- `userEmail` (string) - Filter by user email (partial match)
- `action` (string) - Filter by action type
- `resource` (string) - Filter by resource type
- `resourceId` (number) - Filter by resource ID
- `status` (string) - Filter by status (SUCCESS, FAILURE, ERROR)
- `startDate` (ISO date) - Start date filter
- `endDate` (ISO date) - End date filter
- `ipAddress` (string) - Filter by IP address
- `limit` (number) - Results limit (default: 100)
- `offset` (number) - Results offset (default: 0)

**Example:**
```bash
GET /api/soc/audit-logs?action=LOGIN_FAILED&status=FAILURE&limit=50
```

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "userId": 123,
      "userEmail": "user@example.com",
      "action": "LOGIN_FAILED",
      "resource": "AUTH",
      "resourceId": null,
      "details": { "email": "user@example.com" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "status": "FAILURE",
      "errorMessage": "Invalid email or password",
      "createdAt": "2025-12-07T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

### Get Statistics

```http
GET /api/soc/stats
```

**Query Parameters:**
- `startDate` (ISO date) - Start date for statistics
- `endDate` (ISO date) - End date for statistics

**Response:**
```json
{
  "totalLogs": 1000,
  "byAction": {
    "LOGIN": 500,
    "CREATE": 200,
    "UPDATE": 150,
    "DELETE": 50,
    "LOGIN_FAILED": 100
  },
  "byResource": {
    "AUTH": 600,
    "SOLDIER": 200,
    "DEPARTMENT": 100,
    "ROLE": 50,
    "ROOM": 50
  },
  "byStatus": {
    "SUCCESS": 900,
    "FAILURE": 100
  },
  "byUser": {
    "admin@example.com": 300,
    "user@example.com": 200
  },
  "recentFailures": 10,
  "recentUnauthorized": 5
}
```

### Get Security Alerts

```http
GET /api/soc/alerts
```

**Query Parameters:**
- `limit` (number) - Number of alerts (default: 50)

Returns recent security alerts (failed logins, unauthorized access, etc.) from the last 24 hours.

**Response:**
```json
[
  {
    "id": 1,
    "action": "LOGIN_FAILED",
    "resource": "AUTH",
    "status": "FAILURE",
    "ipAddress": "192.168.1.1",
    "createdAt": "2025-12-07T10:00:00Z"
  }
]
```

### Get User Activity

```http
GET /api/soc/users/:userId/activity
```

**Query Parameters:**
- `days` (number) - Number of days to look back (default: 30)

**Response:**
```json
[
  {
    "id": 1,
    "action": "LOGIN",
    "resource": "AUTH",
    "status": "SUCCESS",
    "createdAt": "2025-12-07T10:00:00Z"
  }
]
```

### Get Resource History

```http
GET /api/soc/resources/:resource/:resourceId
```

**Example:**
```bash
GET /api/soc/resources/SOLDIER/123
```

Returns complete audit trail for a specific resource.

## Implementation Details

### Automatic Logging

The system automatically logs all API requests through middleware:

```typescript
app.use(auditMiddleware);
```

This middleware:
- Intercepts all requests
- Determines action and resource from route
- Extracts user information from JWT token
- Captures IP address and user agent
- Logs after request completion
- Never blocks the request (async logging)

### Manual Logging

You can also manually create audit logs:

```typescript
import { auditFromRequest } from '../lib/audit';

await auditFromRequest(req, 'CREATE', 'SOLDIER', {
  resourceId: 123,
  status: 'SUCCESS',
  details: { name: 'John Doe' }
});
```

### Authentication Events

Authentication events are logged in the auth controller:
- Successful login → `LOGIN` action
- Failed login → `LOGIN_FAILED` action
- Registration → `REGISTER` action
- Authentication failure → `AUTH_FAILED` action

## Security Considerations

1. **Access Control**: SOC endpoints require authentication. Consider adding role-based access control for production.

2. **Data Retention**: Implement a retention policy for audit logs (e.g., delete logs older than 1 year).

3. **Performance**: Audit logging is asynchronous and won't block requests, but large log tables may need indexing optimization.

4. **Privacy**: Audit logs may contain sensitive information. Ensure proper access controls.

5. **Compliance**: Audit logs help meet compliance requirements (SOC 2, GDPR, etc.).

## Best Practices

1. **Regular Monitoring**: Review security alerts regularly
2. **Anomaly Detection**: Monitor for unusual patterns (multiple failed logins, unusual access times)
3. **User Activity Reviews**: Periodically review user activity for compliance
4. **Log Rotation**: Implement log rotation/archival for long-term storage
5. **Backup**: Ensure audit logs are backed up regularly

## Example Use Cases

### Monitor Failed Login Attempts

```bash
GET /api/soc/audit-logs?action=LOGIN_FAILED&status=FAILURE&limit=100
```

### Track User Activity

```bash
GET /api/soc/users/123/activity?days=7
```

### Security Dashboard

```bash
GET /api/soc/stats?startDate=2025-12-01&endDate=2025-12-07
GET /api/soc/alerts?limit=20
```

### Resource Audit Trail

```bash
GET /api/soc/resources/SOLDIER/123
```

## Future Enhancements

- Real-time alerting (webhooks, email notifications)
- Advanced analytics and reporting
- Export functionality (CSV, PDF)
- Integration with SIEM systems
- Machine learning for anomaly detection
- Role-based access control for SOC endpoints

