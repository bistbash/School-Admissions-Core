-- CreateTable
CREATE TABLE "TrustedUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "ipAddress" TEXT,
    "email" TEXT,
    "name" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "expiresAt" DATETIME
);

-- CreateIndex
CREATE INDEX "TrustedUser_userId_idx" ON "TrustedUser"("userId");

-- CreateIndex
CREATE INDEX "TrustedUser_ipAddress_idx" ON "TrustedUser"("ipAddress");

-- CreateIndex
CREATE INDEX "TrustedUser_email_idx" ON "TrustedUser"("email");

-- CreateIndex
CREATE INDEX "TrustedUser_isActive_idx" ON "TrustedUser"("isActive");
