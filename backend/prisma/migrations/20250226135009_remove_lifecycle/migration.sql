/*
  Warnings:

  - You are about to drop the column `lifecycleId` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the `lifecycles` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'highlight';

-- DropForeignKey
ALTER TABLE "actors" DROP CONSTRAINT "actors_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_lifecycleId_fkey";

-- DropForeignKey
ALTER TABLE "lifecycles" DROP CONSTRAINT "lifecycles_metadataId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organizationId_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "lifecycleId";

-- DropTable
DROP TABLE "lifecycles";

-- DropEnum
DROP TYPE "LifecycleStatus";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
