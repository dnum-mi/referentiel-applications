-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessDivisionId" TEXT;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_businessDivisionId_fkey" FOREIGN KEY ("businessDivisionId") REFERENCES "BusinessDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
