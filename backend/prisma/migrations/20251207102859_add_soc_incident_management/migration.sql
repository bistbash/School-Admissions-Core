-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "analystNotes" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "assignedTo" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN "incidentStatus" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "priority" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "AuditLog" ADD COLUMN "resolvedBy" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_incidentStatus_idx" ON "AuditLog"("incidentStatus");

-- CreateIndex
CREATE INDEX "AuditLog_priority_idx" ON "AuditLog"("priority");

-- CreateIndex
CREATE INDEX "AuditLog_assignedTo_idx" ON "AuditLog"("assignedTo");
