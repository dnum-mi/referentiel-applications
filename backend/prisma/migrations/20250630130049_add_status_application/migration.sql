/*
  Warnings:

  - You are about to drop the column `eventId` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('under_construction', 'in_production_mvp', 'in_production', 'in_production_decommissioning', 'decommissioned', 'deleted');

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_eventId_fkey";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'under_construction';

-- AlterTable
ALTER TABLE "metadata" DROP COLUMN "eventId";

-- DropTable
DROP TABLE "events";

-- DropEnum
DROP TYPE "EventType";
