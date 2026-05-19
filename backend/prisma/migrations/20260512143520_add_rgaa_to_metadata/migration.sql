-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "rgaaComplianceId" TEXT;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_rgaaComplianceId_fkey" FOREIGN KEY ("rgaaComplianceId") REFERENCES "RgaaCompliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
