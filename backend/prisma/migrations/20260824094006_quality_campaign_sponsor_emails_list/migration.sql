/*
  Warnings:

  - You are about to drop the column `sponsorEmail` on the `QualityCampaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "QualityCampaign" DROP COLUMN "sponsorEmail",
ADD COLUMN     "sponsorEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
