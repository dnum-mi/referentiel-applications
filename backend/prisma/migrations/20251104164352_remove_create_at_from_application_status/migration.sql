/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ApplicationStatus` table. All the data in the column will be lost.
  - Made the column `statusDate` on table `ApplicationStatus` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ApplicationStatus_createdAt_idx";

-- Backfill statusDate for existing rows before making it NOT NULL
-- Prefer existing createdAt when present, otherwise use current timestamp
UPDATE "ApplicationStatus"
SET "statusDate" = COALESCE("statusDate", COALESCE("createdAt", CURRENT_TIMESTAMP))
WHERE "statusDate" IS NULL;

-- AlterTable
ALTER TABLE "ApplicationStatus" DROP COLUMN "createdAt",
ALTER COLUMN "statusDate" SET NOT NULL,
ALTER COLUMN "statusDate" SET DEFAULT CURRENT_TIMESTAMP;
