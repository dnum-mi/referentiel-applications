-- CreateEnum
CREATE TYPE "CapabilityNames" AS ENUM ('CreateApplication');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "capabilities" "CapabilityNames"[];
