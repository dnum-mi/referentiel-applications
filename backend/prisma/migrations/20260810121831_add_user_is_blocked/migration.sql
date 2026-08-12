-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedById" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;
