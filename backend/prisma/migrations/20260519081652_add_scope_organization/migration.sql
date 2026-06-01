-- AlterTable
ALTER TABLE "User" ADD COLUMN     "scopeOrganizationId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeOrganizationId_fkey" FOREIGN KEY ("scopeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
