-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "apiKeyId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN "httpMethod" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "httpPath" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestSize" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN "responseSize" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN "responseTime" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_apiKeyId_idx" ON "AuditLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "AuditLog_httpMethod_httpPath_idx" ON "AuditLog"("httpMethod", "httpPath");
