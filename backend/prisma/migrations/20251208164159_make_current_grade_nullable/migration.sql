-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cohort" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "currentGrade" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cohort" ("createdAt", "currentGrade", "id", "isActive", "name", "startYear", "updatedAt") SELECT "createdAt", "currentGrade", "id", "isActive", "name", "startYear", "updatedAt" FROM "Cohort";
DROP TABLE "Cohort";
ALTER TABLE "new_Cohort" RENAME TO "Cohort";
CREATE UNIQUE INDEX "Cohort_name_key" ON "Cohort"("name");
CREATE INDEX "Cohort_startYear_idx" ON "Cohort"("startYear");
CREATE INDEX "Cohort_isActive_idx" ON "Cohort"("isActive");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
