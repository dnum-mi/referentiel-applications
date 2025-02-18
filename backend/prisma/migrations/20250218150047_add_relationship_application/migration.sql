/*
  Warnings:

  - You are about to drop the column `parentId` on the `applications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('is_part_of', 'in_replacement_of', 'is_service_user_of', 'is_data_user_of');

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_parentId_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "parentId";

-- CreateTable
CREATE TABLE "relations" (
    "type" "RelationType" NOT NULL,
    "applicationSource" TEXT NOT NULL,
    "applicationTarget" TEXT NOT NULL,

    CONSTRAINT "relations_pkey" PRIMARY KEY ("applicationSource","applicationTarget","type")
);

-- AddForeignKey
ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationSource_fkey" FOREIGN KEY ("applicationSource") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationTarget_fkey" FOREIGN KEY ("applicationTarget") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
