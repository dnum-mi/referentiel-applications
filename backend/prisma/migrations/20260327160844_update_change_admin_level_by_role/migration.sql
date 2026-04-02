/*
  Warnings:

  - You are about to drop the column `adminLevel` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('VISITOR', 'READER', 'CONTRIBUTOR', 'ADMIN');

-- AlterTable: add role as nullable to allow data migration
ALTER TABLE "User" ADD COLUMN "role" "Roles";

-- Migrate data from adminLevel to role
UPDATE "User"
SET "role" = CASE
    WHEN "adminLevel" = 30 THEN 'ADMIN'::"Roles"
    WHEN "adminLevel" = 20 THEN 'CONTRIBUTOR'::"Roles"
    WHEN "adminLevel" = 10 THEN 'READER'::"Roles"
    ELSE 'VISITOR'::"Roles"
END;

-- Set NOT NULL and default
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VISITOR'::"Roles";

-- Drop adminLevel
ALTER TABLE "User" DROP COLUMN "adminLevel";
