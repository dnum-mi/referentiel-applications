-- CreateEnum
CREATE TYPE "priorityRestart" AS ENUM ('p0', 'p1', 'p2', 'p3', 'p4', 'p5');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "priorityRestart" "priorityRestart";
