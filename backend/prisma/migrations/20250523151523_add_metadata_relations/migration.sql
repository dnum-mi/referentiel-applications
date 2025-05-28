/*
  Warnings:

  - You are about to drop the column `metadataId` on the `ExternalRessource` table. All the data in the column will be lost.
  - You are about to drop the column `metadataId` on the `actors` table. All the data in the column will be lost.
  - You are about to drop the column `metadataId` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `metadataId` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `metadataId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `metadataId` on the `labels` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `metadata` table. All the data in the column will be lost.
  - Added the required column `applicationId` to the `metadata` table without a default value. This is not possible if the table is not empty.

*/

-- 1. add applicationId
ALTER TABLE "metadata" ADD COLUMN "applicationId" TEXT;

-- 2. Remplir les valeurs existantes à partir de la relation inversée
UPDATE "metadata"
SET "applicationId" = "applications"."id"
FROM "applications"
WHERE "applications"."metadataId" = "metadata"."id" AND "applications"."id" IS NOT NULL;

-- 4. Create enum type for action
CREATE TYPE "MetadataAction" AS ENUM ('add', 'update', 'delete');

-- 5. Drop foreign key constraints on metadataId columns in other tables
ALTER TABLE "ExternalRessource" DROP CONSTRAINT "ExternalRessource_metadataId_fkey";
ALTER TABLE "actors" DROP CONSTRAINT "actors_metadataId_fkey";
ALTER TABLE "applications" DROP CONSTRAINT "applications_metadataId_fkey";
ALTER TABLE "compliances" DROP CONSTRAINT "compliances_metadataId_fkey";
ALTER TABLE "events" DROP CONSTRAINT "events_metadataId_fkey";
ALTER TABLE "labels" DROP CONSTRAINT "labels_metadataId_fkey";

-- Drop foreign key on updatedById in metadata
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_updatedById_fkey";

DELETE FROM "metadata" WHERE "applicationId" IS NULL;

ALTER TABLE "metadata" ALTER COLUMN "applicationId" SET NOT NULL;

-- 6. Drop metadataId columns in related tables
ALTER TABLE "ExternalRessource" DROP COLUMN "metadataId";
ALTER TABLE "actors" DROP COLUMN "metadataId";
ALTER TABLE "applications" DROP COLUMN "metadataId";
ALTER TABLE "compliances" DROP COLUMN "metadataId";
ALTER TABLE "events" DROP COLUMN "metadataId";
ALTER TABLE "labels" DROP COLUMN "metadataId";

-- 7. Alter metadata: drop columns and add new columns (except applicationId already added)
ALTER TABLE "metadata"
DROP COLUMN "updatedAt",
DROP COLUMN "updatedById",
ADD COLUMN "action" "MetadataAction" NOT NULL DEFAULT 'add',
ADD COLUMN "actorId" TEXT,
ADD COLUMN "complianceId" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "eventId" TEXT,
ADD COLUMN "externalRessourceId" TEXT,
ADD COLUMN "hostingId" TEXT,
ADD COLUMN "labelId" TEXT;

-- 8. Add foreign keys on the new columns in metadata
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "compliances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_externalRessourceId_fkey" FOREIGN KEY ("externalRessourceId") REFERENCES "ExternalRessource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_hostingId_fkey" FOREIGN KEY ("hostingId") REFERENCES "Hosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
