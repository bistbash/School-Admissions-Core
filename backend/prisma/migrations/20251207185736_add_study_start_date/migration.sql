/*
  Warnings:

  - Added the required column `studyStartDate` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "grade" TEXT,
    "parallel" TEXT,
    "track" TEXT,
    "cohortId" INTEGER NOT NULL,
    "studyStartDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateOfBirth" DATETIME,
    "email" TEXT,
    "aliyahDate" DATETIME,
    "locality" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "locality2" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "parent1IdNumber" TEXT,
    "parent1FirstName" TEXT,
    "parent1LastName" TEXT,
    "parent1Type" TEXT,
    "parent1Mobile" TEXT,
    "parent1Email" TEXT,
    "parent2IdNumber" TEXT,
    "parent2FirstName" TEXT,
    "parent2LastName" TEXT,
    "parent2Type" TEXT,
    "parent2Mobile" TEXT,
    "parent2Email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Insert existing students with studyStartDate based on cohort startYear or createdAt
INSERT INTO "new_Student" ("address", "address2", "aliyahDate", "cohortId", "createdAt", "dateOfBirth", "email", "firstName", "gender", "grade", "id", "idNumber", "lastName", "locality", "locality2", "mobilePhone", "parallel", "parent1Email", "parent1FirstName", "parent1IdNumber", "parent1LastName", "parent1Mobile", "parent1Type", "parent2Email", "parent2FirstName", "parent2IdNumber", "parent2LastName", "parent2Mobile", "parent2Type", "phone", "status", "track", "updatedAt", "studyStartDate")
SELECT 
  s."address", s."address2", s."aliyahDate", s."cohortId", s."createdAt", s."dateOfBirth", s."email", s."firstName", s."gender", s."grade", s."id", s."idNumber", s."lastName", s."locality", s."locality2", s."mobilePhone", s."parallel", s."parent1Email", s."parent1FirstName", s."parent1IdNumber", s."parent1LastName", s."parent1Mobile", s."parent1Type", s."parent2Email", s."parent2FirstName", s."parent2IdNumber", s."parent2LastName", s."parent2Mobile", s."parent2Type", s."phone", s."status", s."track", s."updatedAt",
  -- Use cohort startYear (September 1st of that year) or createdAt as fallback
  CASE 
    WHEN c."startYear" IS NOT NULL THEN 
      datetime(c."startYear" || '-09-01 00:00:00')
    ELSE 
      s."createdAt"
  END as "studyStartDate"
FROM "Student" s
LEFT JOIN "Cohort" c ON c."id" = s."cohortId";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_idNumber_key" ON "Student"("idNumber");
CREATE INDEX "Student_idNumber_idx" ON "Student"("idNumber");
CREATE INDEX "Student_cohortId_idx" ON "Student"("cohortId");
CREATE INDEX "Student_status_idx" ON "Student"("status");
CREATE INDEX "Student_grade_idx" ON "Student"("grade");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
