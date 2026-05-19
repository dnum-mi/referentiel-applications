/*
  Warnings:

  - You are about to drop the column `dataSourceId` on the `Metadata` table. All the data in the column will be lost.
  - You are about to drop the `DataSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DataSourceType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Family` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sensibility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UpdateFrequency` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DataUpdateFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "OpenDataStatus" AS ENUM ('EXPOSED', 'NOT_EXPOSED', 'NOT_EXPOSABLE');

-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_familyId_fkey";

-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_sensibilityId_fkey";

-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_typeId_fkey";

-- DropForeignKey
ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_updateFrequencyId_fkey";

-- DropForeignKey
ALTER TABLE "Metadata" DROP CONSTRAINT "Metadata_dataSourceId_fkey";

-- AlterTable
ALTER TABLE "Metadata" DROP COLUMN "dataSourceId",
ADD COLUMN     "dataApplicationId" TEXT,
ADD COLUMN     "dataDescriptionId" TEXT;

-- DropTable
DROP TABLE "DataSource";

-- DropTable
DROP TABLE "DataSourceType";

-- DropTable
DROP TABLE "Family";

-- DropTable
DROP TABLE "Sensibility";

-- DropTable
DROP TABLE "UpdateFrequency";

-- CreateTable
CREATE TABLE "DataFamily" (
    "id" TEXT NOT NULL,
    "path" VARCHAR(255) NOT NULL,

    CONSTRAINT "DataFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSensibility" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "color" VARCHAR(50) NOT NULL,

    CONSTRAINT "DataSensibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDescription" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "familyId" TEXT,
    "officialUrl" VARCHAR(255),

    CONSTRAINT "DataDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataApplication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "dataDescriptionId" TEXT NOT NULL,
    "example" TEXT,
    "openDataStatus" "OpenDataStatus",
    "isReference" BOOLEAN NOT NULL DEFAULT false,
    "businessUsage" TEXT,
    "documentationUrl" TEXT[],
    "conservation" VARCHAR(255),
    "volumetry" INTEGER,
    "monthlyVolumetry" INTEGER,
    "updateFrequency" "DataUpdateFrequency",
    "sensibilityId" TEXT,

    CONSTRAINT "DataApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExposure" (
    "id" TEXT NOT NULL,
    "applicationDataId" TEXT NOT NULL,
    "type" VARCHAR(255),
    "url" TEXT,
    "endpoint" VARCHAR(255),
    "format" VARCHAR(255),
    "swaggerUrl" TEXT,
    "authenticationType" VARCHAR(255),

    CONSTRAINT "DataExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DataDescriptionToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DataDescriptionToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DataDescriptionToTag_B_index" ON "_DataDescriptionToTag"("B");

-- AddForeignKey
ALTER TABLE "DataDescription" ADD CONSTRAINT "DataDescription_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "DataFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataApplication" ADD CONSTRAINT "DataApplication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataApplication" ADD CONSTRAINT "DataApplication_dataDescriptionId_fkey" FOREIGN KEY ("dataDescriptionId") REFERENCES "DataDescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataApplication" ADD CONSTRAINT "DataApplication_sensibilityId_fkey" FOREIGN KEY ("sensibilityId") REFERENCES "DataSensibility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExposure" ADD CONSTRAINT "DataExposure_applicationDataId_fkey" FOREIGN KEY ("applicationDataId") REFERENCES "DataApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_dataApplicationId_fkey" FOREIGN KEY ("dataApplicationId") REFERENCES "DataApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_dataDescriptionId_fkey" FOREIGN KEY ("dataDescriptionId") REFERENCES "DataDescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DataDescriptionToTag" ADD CONSTRAINT "_DataDescriptionToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "DataDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DataDescriptionToTag" ADD CONSTRAINT "_DataDescriptionToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
