-- CreateEnum
CREATE TYPE "HomologationStatus" AS ENUM ('homologuee', 'en_cours', 'dispensee');

-- AlterTable
ALTER TABLE "Compliance" ADD COLUMN     "homologation_status" "HomologationStatus";
