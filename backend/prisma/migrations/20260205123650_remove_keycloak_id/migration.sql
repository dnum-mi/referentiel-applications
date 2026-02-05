/*
  Warnings:

  - You are about to drop the column `keycloakId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_keycloakId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "keycloakId";
