/*
  Warnings:

  - Added the required column `email` to the `Soldier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Soldier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Soldier` table without a default value. This is not possible if the table is not empty.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Soldier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Soldier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Soldier" ("departmentId", "id", "isCommander", "name", "personalNumber", "roleId", "type") SELECT "departmentId", "id", "isCommander", "name", "personalNumber", "roleId", "type" FROM "Soldier";
DROP TABLE "Soldier";
ALTER TABLE "new_Soldier" RENAME TO "Soldier";
CREATE UNIQUE INDEX "Soldier_personalNumber_key" ON "Soldier"("personalNumber");
CREATE UNIQUE INDEX "Soldier_email_key" ON "Soldier"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
