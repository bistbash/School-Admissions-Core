# המלצות לשיפור מערכת SOC - ניטור אבטחה בזמן אמת

## בעיות זוהו במערכת הנוכחית

1. **חוסר ניטור בזמן אמת** - המידע מתעדכן רק בעת רענון ידני
2. **אי דיוקים במידע** - חוסר סינכרון בין אירועים אמיתיים לנתונים המוצגים
3. **חוסר זיהוי אוטומטי של פרצות אבטחה** - המערכת לא מזהה אוטומטית התנהגות חריגה
4. **התראות לא מיידיות** - אין התראות בזמן אמת על אירועי אבטחה

## חבילות npm מומלצות

### 1. ניטור בזמן אמת (Real-time Monitoring)

#### `socket.io` + `socket.io-client`
```bash
npm install socket.io socket.io-client
```
**שימוש:**
- העברת אירועי אבטחה בזמן אמת ללקוח
- עדכונים אוטומטיים על תקריות חדשות
- התראות מיידיות על פרצות אבטחה

**יתרונות:**
- תמיכה ב-WebSocket עם fallback ל-polling
- תמיכה ב-rooms לניטור לפי נושאים
- אמין ומוכח בפרודקשן

#### `ws` (WebSocket)
```bash
npm install ws @types/ws
```
**שימוש:**
- חלופה קלה יותר ל-socket.io
- מתאים למערכות קטנות יותר
- ביצועים מעולים

### 2. זיהוי אנומליות ופרצות אבטחה

#### `anomaly-detection` / `outlier-detection`
```bash
npm install outlier-detection
```
**שימוש:**
- זיהוי התנהגות חריגה בפעילות משתמשים
- זיהוי ניסיונות התקפה
- זיהוי פעילות חשודה

#### `simple-statistics`
```bash
npm install simple-statistics
```
**שימוש:**
- חישוב סטיות תקן וזיהוי אנומליות סטטיסטיות
- ניתוח מגמות בפעילות
- זיהוי פעילות חריגה

#### `ml-matrix` / `ml-regression`
```bash
npm install ml-matrix ml-regression
```
**שימוש:**
- זיהוי אנומליות באמצעות למידת מכונה
- ניתוח התנהגות משתמשים
- חיזוי התקפות

### 3. ניתוח התנהגות וזיהוי איומים

#### `node-rate-limiter-redis` / `rate-limiter-flexible`
```bash
npm install rate-limiter-flexible
```
**שימוש:**
- זיהוי ניסיונות brute force
- זיהוי פעילות חשודה
- הגנה מפני התקפות

#### `fast-geoip` (מומלץ) / `@maxmind/geoip2-node`
```bash
npm install fast-geoip
# או לחלופין:
npm install @maxmind/geoip2-node
```
**שימוש:**
- זיהוי התחברויות ממיקומים חשודים
- ניתוח גיאוגרפי של פעילות
- זיהוי VPN/Proxy חשודים
- **הערה:** `geoip-lite` הוסר כי הוא משתמש בחבילות ישנות (deprecated). `fast-geoip` הוא חלופה מודרנית ומהירה יותר

#### `ua-parser-js`
```bash
npm install ua-parser-js
```
**שימוש:**
- ניתוח User-Agent לזיהוי בוטים
- זיהוי כלים אוטומטיים
- זיהוי פעילות חשודה

### 4. התראות וניטור

#### `node-cron`
```bash
npm install node-cron @types/node-cron
```
**שימוש:**
- בדיקות תקופתיות לאיתור בעיות
- סריקות אבטחה אוטומטיות
- דוחות תקופתיים

#### `bull` / `bullmq` (Job Queue)
```bash
npm install bullmq ioredis
```
**שימוש:**
- עיבוד אירועי אבטחה ברקע
- התראות אוטומטיות
- ניתוח אסינכרוני

#### `winston` / `pino` (כבר קיים)
**שימוש:**
- לוגים מובנים לניתוח
- אינטגרציה עם מערכות SIEM
- מעקב אחר אירועים

### 5. ניתוח לוגים ואירועים

#### `logdna` / `winston-cloudwatch`
```bash
npm install winston-cloudwatch
```
**שימוש:**
- שליחת לוגים למערכות ניטור חיצוניות
- ניתוח מתקדם של אירועים
- התראות אוטומטיות

#### `elasticsearch` (אופציונלי)
```bash
npm install @elastic/elasticsearch
```
**שימוש:**
- חיפוש וניתוח מתקדם של לוגים
- ניתוח מגמות
- זיהוי דפוסים

### 6. אבטחה מתקדמת

#### `helmet` (כבר קיים)
**שימוש:**
- הגנה מפני התקפות נפוצות
- אבטחת headers

#### `express-rate-limit` (כבר קיים)
**שימוש:**
- הגנה מפני brute force
- הגבלת בקשות

#### `express-validator`
```bash
npm install express-validator
```
**שימוש:**
- אימות קלט מפני injection
- הגנה מפני XSS

## תוכנית יישום מומלצת

### שלב 1: ניטור בזמן אמת (דחוף)
1. התקנת `socket.io`
2. יצירת WebSocket server
3. עדכון SOCPage לקבל עדכונים בזמן אמת
4. העברת אירועי אבטחה בזמן אמת

### שלב 2: זיהוי אנומליות (דחוף)
1. התקנת חבילות זיהוי אנומליות
2. יצירת service לזיהוי התנהגות חריגה
3. אינטגרציה עם audit logs
4. התראות אוטומטיות על אנומליות

### שלב 3: ניתוח מתקדם (בינוני)
1. ניתוח גיאוגרפי של פעילות
2. זיהוי בוטים וכלים אוטומטיים
3. ניתוח מגמות
4. דוחות אוטומטיים

### שלב 4: אינטגרציה חיצונית (ארוך טווח)
1. אינטגרציה עם SIEM
2. שליחת התראות ל-Slack/Email
3. ניתוח מתקדם עם Elasticsearch

## דוגמאות קוד

### 1. WebSocket Server (socket.io)

```typescript
// backend/src/lib/soc/soc-websocket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export function initializeSOCWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'SOC client connected');

    // Join SOC room for real-time updates
    socket.join('soc-monitoring');

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'SOC client disconnected');
    });
  });

  return io;
}

export function emitSecurityEvent(event: {
  type: 'INCIDENT' | 'ALERT' | 'ANOMALY' | 'BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data: any;
}) {
  if (io) {
    io.to('soc-monitoring').emit('security-event', event);
    logger.info({ event }, 'Emitted security event');
  }
}

export function emitAuditLogUpdate(log: any) {
  if (io) {
    io.to('soc-monitoring').emit('audit-log-update', log);
  }
}
```

### 2. Anomaly Detection Service

```typescript
// backend/src/lib/soc/anomaly-detection.ts
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { emitSecurityEvent } from './soc-websocket';
import * as stats from 'simple-statistics';

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  score: number;
}

export class AnomalyDetectionService {
  /**
   * Detect anomalies in user activity
   */
  async detectUserActivityAnomalies(userId: number, timeWindow: number = 3600000): Promise<AnomalyDetectionResult[]> {
    const oneHourAgo = new Date(Date.now() - timeWindow);
    
    // Get recent activity for user
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for unusual activity volume
    const activityCount = recentLogs.length;
    const avgActivity = await this.getAverageActivity(userId);
    
    if (activityCount > avgActivity * 3) {
      anomalies.push({
        isAnomaly: true,
        severity: 'HIGH',
        reason: `Unusual activity volume: ${activityCount} actions in last hour (avg: ${avgActivity})`,
        score: activityCount / avgActivity
      });
    }

    // Check for failed login attempts
    const failedLogins = recentLogs.filter(log => 
      log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED'
    ).length;

    if (failedLogins > 5) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Multiple failed login attempts: ${failedLogins}`,
        score: failedLogins
      });
    }

    // Check for unauthorized access attempts
    const unauthorizedAttempts = recentLogs.filter(log =>
      log.action === 'UNAUTHORIZED_ACCESS'
    ).length;

    if (unauthorizedAttempts > 0) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Unauthorized access attempts detected: ${unauthorizedAttempts}`,
        score: unauthorizedAttempts * 10
      });
    }

    // Check for unusual IP addresses
    const uniqueIPs = new Set(recentLogs.map(log => log.ipAddress).filter(Boolean));
    if (uniqueIPs.size > 3) {
      anomalies.push({
        isAnomaly: true,
        severity: 'MEDIUM',
        reason: `Multiple IP addresses detected: ${uniqueIPs.size}`,
        score: uniqueIPs.size
      });
    }

    return anomalies;
  }

  /**
   * Detect anomalies in IP activity
   */
  async detectIPAnomalies(ipAddress: string, timeWindow: number = 3600000): Promise<AnomalyDetectionResult[]> {
    const oneHourAgo = new Date(Date.now() - timeWindow);
    
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo }
      }
    });

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for brute force attempts
    const failedAuthAttempts = recentLogs.filter(log =>
      log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED'
    ).length;

    if (failedAuthAttempts > 10) {
      anomalies.push({
        isAnomaly: true,
        severity: 'CRITICAL',
        reason: `Potential brute force attack: ${failedAuthAttempts} failed attempts`,
        score: failedAuthAttempts
      });
    }

    // Check for multiple user accounts from same IP
    const uniqueUsers = new Set(recentLogs.map(log => log.userId).filter(Boolean));
    if (uniqueUsers.size > 5) {
      anomalies.push({
        isAnomaly: true,
        severity: 'HIGH',
        reason: `Multiple user accounts from same IP: ${uniqueUsers.size}`,
        score: uniqueUsers.size
      });
    }

    // Check for unusual request patterns
    const requestTimes = recentLogs.map(log => new Date(log.createdAt).getTime());
    if (requestTimes.length > 0) {
      const intervals = [];
      for (let i = 1; i < requestTimes.length; i++) {
        intervals.push(requestTimes[i] - requestTimes[i - 1]);
      }
      
      if (intervals.length > 0) {
        const meanInterval = stats.mean(intervals);
        const stdDev = stats.standardDeviation(intervals);
        
        // Check for automated/bot-like behavior (very consistent intervals)
        if (stdDev < meanInterval * 0.1 && intervals.length > 10) {
          anomalies.push({
            isAnomaly: true,
            severity: 'MEDIUM',
            reason: 'Automated/bot-like behavior detected (consistent request intervals)',
            score: 5
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Get average activity for a user
   */
  private async getAverageActivity(userId: number): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const totalLogs = await prisma.auditLog.count({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    return totalLogs / 30; // Average per day
  }

  /**
   * Monitor and detect anomalies continuously
   */
  async startContinuousMonitoring() {
    setInterval(async () => {
      try {
        // Get recent security events
        const oneHourAgo = new Date(Date.now() - 3600000);
        
        const recentSecurityEvents = await prisma.auditLog.findMany({
          where: {
            OR: [
              { action: 'LOGIN_FAILED' },
              { action: 'AUTH_FAILED' },
              { action: 'UNAUTHORIZED_ACCESS' },
              { status: 'FAILURE' }
            ],
            createdAt: { gte: oneHourAgo }
          },
          include: {
            user: true
          }
        });

        // Check each event for anomalies
        for (const event of recentSecurityEvents) {
          if (event.userId) {
            const userAnomalies = await this.detectUserActivityAnomalies(event.userId);
            for (const anomaly of userAnomalies) {
              if (anomaly.isAnomaly) {
                await this.handleAnomaly(anomaly, event);
              }
            }
          }

          if (event.ipAddress) {
            const ipAnomalies = await this.detectIPAnomalies(event.ipAddress);
            for (const anomaly of ipAnomalies) {
              if (anomaly.isAnomaly) {
                await this.handleAnomaly(anomaly, event);
              }
            }
          }
        }
      } catch (error) {
        logger.error({ error }, 'Error in continuous anomaly monitoring');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async handleAnomaly(anomaly: AnomalyDetectionResult, event: any) {
    // Emit real-time alert
    emitSecurityEvent({
      type: 'ANOMALY',
      severity: anomaly.severity,
      data: {
        anomaly,
        event,
        timestamp: new Date()
      }
    });

    // Mark as incident if critical
    if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
      await prisma.auditLog.update({
        where: { id: event.id },
        data: {
          incidentStatus: 'NEW',
          priority: anomaly.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
        }
      });
    }

    logger.warn({ anomaly, eventId: event.id }, 'Security anomaly detected');
  }
}
```

### 3. Frontend Integration (React)

```typescript
// frontend/src/features/soc/useSOCWebSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SecurityEvent {
  type: 'INCIDENT' | 'ALERT' | 'ANOMALY' | 'BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data: any;
}

export function useSOCWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to SOC WebSocket');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from SOC WebSocket');
    });

    newSocket.on('security-event', (event: SecurityEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
      
      // Show notification for critical/high severity events
      if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
        // You can use a notification library here
        console.warn('Security Alert:', event);
      }
    });

    newSocket.on('audit-log-update', (log: any) => {
      // Handle real-time audit log updates
      console.log('Audit log update:', log);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, events, connected };
}
```

## סיכום

### חבילות מומלצות להתקנה מיידית:

1. **socket.io** + **socket.io-client** - ניטור בזמן אמת
2. **simple-statistics** - זיהוי אנומליות סטטיסטיות
3. **rate-limiter-flexible** - זיהוי brute force
4. **geoip-lite** - ניתוח גיאוגרפי
5. **ua-parser-js** - זיהוי בוטים

### שיפורים עיקריים:

1. ✅ ניטור בזמן אמת עם WebSocket
2. ✅ זיהוי אוטומטי של אנומליות
3. ✅ התראות מיידיות על פרצות אבטחה
4. ✅ ניתוח התנהגות מתקדם
5. ✅ זיהוי אוטומטי של התקפות

### צעדים הבאים:

1. התקנת החבילות המומלצות
2. יישום WebSocket server
3. יצירת Anomaly Detection Service
4. עדכון Frontend לקבל עדכונים בזמן אמת
5. בדיקות ואופטימיזציה
