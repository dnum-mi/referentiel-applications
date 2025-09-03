/*
  Warnings:

  - You are about to drop the column `homologation_duration_months` on the `compliances` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "compliances" DROP COLUMN "homologation_duration_months",
ADD COLUMN     "homologation_date_end" TIMESTAMP(3);
