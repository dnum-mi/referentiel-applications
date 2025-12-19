-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('business', 'core_service', 'sso', 'website_communication', 'intranet_communication_website');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "type" "ApplicationType";
