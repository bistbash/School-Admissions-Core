-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "userEmail" TEXT,
    "apiKeyId" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" INTEGER,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "httpMethod" TEXT,
    "httpPath" TEXT,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "responseTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentStatus" TEXT,
    "priority" TEXT,
    "assignedTo" INTEGER,
    "analystNotes" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" INTEGER,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" DATETIME,
    "pinnedBy" INTEGER,
    CONSTRAINT "AuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "analystNotes", "apiKeyId", "assignedTo", "createdAt", "details", "errorMessage", "httpMethod", "httpPath", "id", "incidentStatus", "ipAddress", "priority", "requestSize", "resolvedAt", "resolvedBy", "resource", "resourceId", "responseSize", "responseTime", "status", "userAgent", "userEmail", "userId") SELECT "action", "analystNotes", "apiKeyId", "assignedTo", "createdAt", "details", "errorMessage", "httpMethod", "httpPath", "id", "incidentStatus", "ipAddress", "priority", "requestSize", "resolvedAt", "resolvedBy", "resource", "resourceId", "responseSize", "responseTime", "status", "userAgent", "userEmail", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_apiKeyId_idx" ON "AuditLog"("apiKeyId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_status_idx" ON "AuditLog"("status");
CREATE INDEX "AuditLog_incidentStatus_idx" ON "AuditLog"("incidentStatus");
CREATE INDEX "AuditLog_priority_idx" ON "AuditLog"("priority");
CREATE INDEX "AuditLog_assignedTo_idx" ON "AuditLog"("assignedTo");
CREATE INDEX "AuditLog_httpMethod_httpPath_idx" ON "AuditLog"("httpMethod", "httpPath");
CREATE INDEX "AuditLog_isPinned_idx" ON "AuditLog"("isPinned");
CREATE INDEX "AuditLog_pinnedAt_idx" ON "AuditLog"("pinnedAt");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
