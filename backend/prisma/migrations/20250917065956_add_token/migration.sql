/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('human', 'bot');

-- DropForeignKey
ALTER TABLE "anomalyNotification" DROP CONSTRAINT "anomalyNotification_notifierId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_createdById_fkey";

-- DropForeignKey
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_dataOwnerId_fkey";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ADD COLUMN     "id" TEXT,
ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'human',
ALTER COLUMN "keycloakId" DROP NOT NULL;

-- replicate data from keycloakId to id
UPDATE "users" SET "id" = "keycloakId";

-- set id column as NOT NULL
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "adminLevel" INTEGER,
    "description" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'active',
    "userIdImpersonate" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_hash_key" ON "Token"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");

-- AddForeignKey
ALTER TABLE "anomalyNotification" ADD CONSTRAINT "anomalyNotification_notifierId_fkey" FOREIGN KEY ("notifierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_dataOwnerId_fkey" FOREIGN KEY ("dataOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userIdImpersonate_fkey" FOREIGN KEY ("userIdImpersonate") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakId_key" ON "users"("keycloakId");