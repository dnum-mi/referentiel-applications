/*
  Warnings:

  - You are about to drop the column `userId` on the `actors` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "actors" DROP CONSTRAINT "actors_userId_fkey";

-- DropIndex
DROP INDEX "actors_userId_idx";

-- AlterTable
ALTER TABLE "actors" DROP COLUMN "userId";
ALTER TABLE "actors" RENAME COLUMN "actorType" TO "type";

