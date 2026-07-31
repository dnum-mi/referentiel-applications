-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastPermissionChangeAt" TIMESTAMP(3),
ADD COLUMN     "lastPermissionChangedById" TEXT;
