/*
  Warnings:

  - You are about to drop the column `metadataId` on the `applications` table. All the data in the column will be lost.
  - Added the required column `applicationId` to the `metadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "metadata" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- Update metadata with applicationId values from applications
UPDATE "metadata"
SET "applicationId" = "applications"."id"
FROM "applications"
WHERE "applications"."metadataId" = "metadata"."id";

-- AlterTable
ALTER TABLE "metadata" ALTER COLUMN "applicationId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "ExternalRessource" DROP CONSTRAINT "ExternalRessource_metadataId_fkey";

-- DropForeignKey
ALTER TABLE "actors" DROP CONSTRAINT "actors_metadataId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_metadataId_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "metadataId";

-- AddForeignKey
ALTER TABLE "ExternalRessource" ADD CONSTRAINT "ExternalRessource_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("keycloakId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
