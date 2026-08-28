-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "impersonatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
