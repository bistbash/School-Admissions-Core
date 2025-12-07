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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Soldier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soldier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Soldier" ("createdAt", "departmentId", "email", "id", "isCommander", "name", "password", "personalNumber", "roleId", "type", "updatedAt", "isAdmin") 
SELECT "createdAt", "departmentId", "email", "id", "isCommander", "name", "password", "personalNumber", "roleId", "type", "updatedAt", 
CASE 
  WHEN "id" = (SELECT MIN("id") FROM "Soldier") THEN 1 
  ELSE 0 
END as "isAdmin"
FROM "Soldier";
DROP TABLE "Soldier";
ALTER TABLE "new_Soldier" RENAME TO "Soldier";
CREATE UNIQUE INDEX "Soldier_personalNumber_key" ON "Soldier"("personalNumber");
CREATE UNIQUE INDEX "Soldier_email_key" ON "Soldier"("email");
CREATE INDEX "Soldier_isAdmin_idx" ON "Soldier"("isAdmin");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- Add first user (admin) to trusted users whitelist if they exist
INSERT INTO "TrustedUser" ("userId", "email", "name", "reason", "isActive", "createdAt", "createdBy")
SELECT 
  s."id" as "userId",
  s."email" as "email",
  s."name" || ' (Admin)' as "name",
  'First registered user - automatic admin' as "reason",
  true as "isActive",
  CURRENT_TIMESTAMP as "createdAt",
  s."id" as "createdBy"
FROM "Soldier" s
WHERE s."isAdmin" = 1
AND NOT EXISTS (
  SELECT 1 FROM "TrustedUser" tu WHERE tu."userId" = s."id"
);
