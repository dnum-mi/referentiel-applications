-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "impersonatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

