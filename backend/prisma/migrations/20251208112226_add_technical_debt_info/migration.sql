-- CreateTable
CREATE TABLE "TechnicalDebtInfo" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "technicalMaturity" SMALLINT,
    "businessMaturity" SMALLINT,
    "costMaturity" SMALLINT,

    CONSTRAINT "TechnicalDebtInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalDebtInfo_applicationId_key" ON "TechnicalDebtInfo"("applicationId");

-- AddForeignKey
ALTER TABLE "TechnicalDebtInfo" ADD CONSTRAINT "TechnicalDebtInfo_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "technicalDebtInfoId" TEXT;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_technicalDebtInfoId_fkey" FOREIGN KEY ("technicalDebtInfoId") REFERENCES "TechnicalDebtInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
