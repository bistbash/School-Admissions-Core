-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Soldier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personalNumber" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" TEXT,
    "departmentId" INTEGER,
    "roleId" INTEGER,
    "isCommander" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'CREATED',
    "needsProfileCompletion" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Soldier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Soldier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Soldier" ("approvalStatus", "createdAt", "departmentId", "email", "id", "isAdmin", "isCommander", "name", "needsProfileCompletion", "password", "personalNumber", "roleId", "type", "updatedAt") SELECT "approvalStatus", "createdAt", "departmentId", "email", "id", "isAdmin", "isCommander", "name", "needsProfileCompletion", "password", "personalNumber", "roleId", "type", "updatedAt" FROM "Soldier";
DROP TABLE "Soldier";
ALTER TABLE "new_Soldier" RENAME TO "Soldier";
CREATE UNIQUE INDEX "Soldier_personalNumber_key" ON "Soldier"("personalNumber");
CREATE UNIQUE INDEX "Soldier_email_key" ON "Soldier"("email");
CREATE INDEX "Soldier_isAdmin_idx" ON "Soldier"("isAdmin");
CREATE INDEX "Soldier_approvalStatus_idx" ON "Soldier"("approvalStatus");
CREATE INDEX "Soldier_needsProfileCompletion_idx" ON "Soldier"("needsProfileCompletion");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
