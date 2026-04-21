-- DropIndex
DROP INDEX "TechnicalDebtInfo_applicationId_key";

-- AlterTable
ALTER TABLE "TechnicalDebtInfo" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "TechnicalDebtInfo_applicationId_createdAt_idx" ON "TechnicalDebtInfo"("applicationId", "createdAt" DESC);
