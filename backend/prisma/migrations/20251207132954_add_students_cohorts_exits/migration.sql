/*
  Warnings:

  - You are about to drop the `APIKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "APIKey";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" TEXT
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "currentGrade" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "parallel" TEXT,
    "track" TEXT,
    "cohortId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentExit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "hasLeft" BOOLEAN NOT NULL DEFAULT true,
    "exitReason" TEXT,
    "exitCategory" TEXT,
    "receivingInstitution" TEXT,
    "wasDesiredExit" BOOLEAN,
    "exitDate" DATETIME,
    "clearanceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "passedSupply" BOOLEAN NOT NULL DEFAULT false,
    "expelledFromSchool" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentExit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_name_key" ON "Cohort"("name");

-- CreateIndex
CREATE INDEX "Cohort_startYear_idx" ON "Cohort"("startYear");

-- CreateIndex
CREATE INDEX "Cohort_isActive_idx" ON "Cohort"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Student_idNumber_key" ON "Student"("idNumber");

-- CreateIndex
CREATE INDEX "Student_idNumber_idx" ON "Student"("idNumber");

-- CreateIndex
CREATE INDEX "Student_cohortId_idx" ON "Student"("cohortId");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_grade_idx" ON "Student"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "StudentExit_studentId_key" ON "StudentExit"("studentId");

-- CreateIndex
CREATE INDEX "StudentExit_studentId_idx" ON "StudentExit"("studentId");

-- CreateIndex
CREATE INDEX "StudentExit_hasLeft_idx" ON "StudentExit"("hasLeft");

-- CreateIndex
CREATE INDEX "StudentExit_exitDate_idx" ON "StudentExit"("exitDate");
