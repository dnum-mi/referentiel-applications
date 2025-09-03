/*
  Warnings:

  - You are about to drop the column `homologation_date` on the `compliances` table. All the data in the column will be lost.

*/
DROP VIEW IF EXISTS export_full_detailed;
-- AlterTable
ALTER TABLE "compliances" DROP COLUMN "homologation_date";
