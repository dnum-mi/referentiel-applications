/*
  Warnings:

  - You are about to drop the `externalSources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `externals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "externalSources" DROP CONSTRAINT "externalSources_metadataId_fkey";

-- DropForeignKey
ALTER TABLE "externals" DROP CONSTRAINT "externals_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "externals" DROP CONSTRAINT "externals_externalSourceId_fkey";

-- DropForeignKey
ALTER TABLE "externals" DROP CONSTRAINT "externals_metadataId_fkey";

-- DropTable
DROP TABLE "externalSources";

-- DropTable
DROP TABLE "externals";

-- DropEnum
DROP TYPE "ExternalSourceType";

-- DropEnum
DROP TYPE "ExternalSourceValueType";
