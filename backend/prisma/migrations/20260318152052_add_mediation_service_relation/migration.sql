-- AlterTable
ALTER TABLE "Relation" ADD COLUMN     "mediationServiceId" TEXT;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_mediationServiceId_fkey" FOREIGN KEY ("mediationServiceId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
