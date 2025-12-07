-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Soldier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personalNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "roleId" INTEGER,
    "isCommander" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "registrationIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Soldier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soldier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Soldier" ("createdAt", "departmentId", "email", "id", "isAdmin", "isCommander", "name", "password", "personalNumber", "roleId", "type", "updatedAt") SELECT "createdAt", "departmentId", "email", "id", "isAdmin", "isCommander", "name", "password", "personalNumber", "roleId", "type", "updatedAt" FROM "Soldier";
DROP TABLE "Soldier";
ALTER TABLE "new_Soldier" RENAME TO "Soldier";
CREATE UNIQUE INDEX "Soldier_personalNumber_key" ON "Soldier"("personalNumber");
CREATE UNIQUE INDEX "Soldier_email_key" ON "Soldier"("email");
CREATE INDEX "Soldier_isAdmin_idx" ON "Soldier"("isAdmin");
CREATE INDEX "Soldier_approvalStatus_idx" ON "Soldier"("approvalStatus");
CREATE INDEX "Soldier_registrationIp_idx" ON "Soldier"("registrationIp");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
