-- CreateTable
CREATE TABLE "ApplicationView" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "ApplicationView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationView_applicationId_createdAt_idx" ON "ApplicationView"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationView_userId_createdAt_idx" ON "ApplicationView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationView_applicationId_userId_createdAt_idx" ON "ApplicationView"("applicationId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationView" ADD CONSTRAINT "ApplicationView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationView" ADD CONSTRAINT "ApplicationView_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
