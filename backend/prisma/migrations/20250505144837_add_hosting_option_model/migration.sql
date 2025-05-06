/*
  Warnings:

  - You are about to drop the column `platformId` on the `Hosting` table. All the data in the column will be lost.
  - You are about to drop the `HostingSite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Platform` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Provider` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Hosting" DROP CONSTRAINT "Hosting_platformId_fkey";

-- DropForeignKey
ALTER TABLE "Platform" DROP CONSTRAINT "Platform_hostingSiteId_fkey";

-- DropForeignKey
ALTER TABLE "Platform" DROP CONSTRAINT "Platform_providerId_fkey";

-- AlterTable
ALTER TABLE "Hosting" DROP COLUMN "platformId",
ADD COLUMN     "hostingOptionId" TEXT;

-- DropTable
DROP TABLE "HostingSite";

-- DropTable
DROP TABLE "Platform";

-- DropTable
DROP TABLE "Provider";

-- CreateTable
CREATE TABLE "HostingOption" (
    "id" TEXT NOT NULL,
    "room" TEXT,
    "building" TEXT,
    "site" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "HostingOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_hostingOptionId_fkey" FOREIGN KEY ("hostingOptionId") REFERENCES "HostingOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
