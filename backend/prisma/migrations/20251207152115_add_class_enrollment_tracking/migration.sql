-- CreateTable
CREATE TABLE "Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grade" TEXT NOT NULL,
    "parallel" TEXT,
    "track" TEXT,
    "academicYear" INTEGER NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "enrollmentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
INSERT INTO "new_Student" ("address", "address2", "aliyahDate", "cohortId", "createdAt", "dateOfBirth", "email", "firstName", "gender", "grade", "id", "idNumber", "lastName", "locality", "locality2", "mobilePhone", "parallel", "parent1Email", "parent1FirstName", "parent1IdNumber", "parent1LastName", "parent1Mobile", "parent1Type", "parent2Email", "parent2FirstName", "parent2IdNumber", "parent2LastName", "parent2Mobile", "parent2Type", "phone", "status", "track", "updatedAt") SELECT "address", "address2", "aliyahDate", "cohortId", "createdAt", "dateOfBirth", "email", "firstName", "gender", "grade", "id", "idNumber", "lastName", "locality", "locality2", "mobilePhone", "parallel", "parent1Email", "parent1FirstName", "parent1IdNumber", "parent1LastName", "parent1Mobile", "parent1Type", "parent2Email", "parent2FirstName", "parent2IdNumber", "parent2LastName", "parent2Mobile", "parent2Type", "phone", "status", "track", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_idNumber_key" ON "Student"("idNumber");
CREATE INDEX "Student_idNumber_idx" ON "Student"("idNumber");
CREATE INDEX "Student_cohortId_idx" ON "Student"("cohortId");
CREATE INDEX "Student_status_idx" ON "Student"("status");
CREATE INDEX "Student_grade_idx" ON "Student"("grade");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Class_academicYear_idx" ON "Class"("academicYear");

-- CreateIndex
CREATE INDEX "Class_grade_idx" ON "Class"("grade");

-- CreateIndex
CREATE INDEX "Class_isActive_idx" ON "Class"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Class_grade_parallel_track_academicYear_key" ON "Class"("grade", "parallel", "track", "academicYear");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE INDEX "Enrollment_enrollmentDate_idx" ON "Enrollment"("enrollmentDate");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_classId_idx" ON "Enrollment"("studentId", "classId");

-- Data Migration: Migrate existing student class data to Class and Enrollment tables
-- Step 1: Get current academic year (defaulting to 2024 if not determinable)
-- Step 2: Create Class records for all unique grade/parallel/track combinations
-- Step 3: Create Enrollment records for all students

-- Insert unique class combinations into Class table
-- Using current year as default academic year (can be adjusted)
INSERT INTO "Class" ("grade", "parallel", "track", "academicYear", "name", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT
    "grade" as "grade",
    "parallel",
    "track",
    2024 as "academicYear", -- Default to 2024, adjust based on your current academic year
    CASE 
        WHEN "parallel" IS NOT NULL AND "track" IS NOT NULL THEN 
            "grade" || ' - ' || "parallel" || ' - ' || "track"
        WHEN "parallel" IS NOT NULL THEN 
            "grade" || ' - ' || "parallel"
        WHEN "track" IS NOT NULL THEN 
            "grade" || ' - ' || "track"
        ELSE 
            "grade"
    END as "name",
    true as "isActive",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "Student"
WHERE "grade" IS NOT NULL
GROUP BY "grade", "parallel", "track";

-- Create Enrollment records for all students
-- Link each student to their corresponding class
INSERT INTO "Enrollment" ("studentId", "classId", "enrollmentDate", "createdAt", "updatedAt")
SELECT 
    s."id" as "studentId",
    c."id" as "classId",
    COALESCE(s."createdAt", CURRENT_TIMESTAMP) as "enrollmentDate",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "Student" s
INNER JOIN "Class" c ON 
    c."grade" = s."grade" AND
    (c."parallel" = s."parallel" OR (c."parallel" IS NULL AND s."parallel" IS NULL)) AND
    (c."track" = s."track" OR (c."track" IS NULL AND s."track" IS NULL)) AND
    c."academicYear" = 2024 -- Match the academic year used above
WHERE s."grade" IS NOT NULL;
