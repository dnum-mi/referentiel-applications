/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Application` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_ownerId_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "ownerId";
