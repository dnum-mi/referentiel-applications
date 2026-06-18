-- AlterTable
ALTER TABLE "TechnicalDebtInfo" ADD COLUMN     "millesime" INTEGER NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE))::integer;

-- CreateIndex
CREATE INDEX "TechnicalDebtInfo_applicationId_millesime_idx" ON "TechnicalDebtInfo"("applicationId", "millesime" DESC);
