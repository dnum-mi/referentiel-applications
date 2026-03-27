/*
  Warnings:

  - You are about to drop the column `adminLevel` on the `Token` table. All the data in the column will be lost.

*/
-- AlterTable
-- AlterTable: add role as nullable to allow data migration
ALTER TABLE "Token" ADD COLUMN "role" "Roles";

-- Migrate data from adminLevel to role
UPDATE "Token"
SET "role" = CASE
    WHEN "adminLevel" = 30 THEN 'ADMIN'::"Roles"
    WHEN "adminLevel" = 20 THEN 'CONTRIBUTOR'::"Roles"
    WHEN "adminLevel" = 10 THEN 'READER'::"Roles"
    ELSE 'VISITOR'::"Roles"
END;

-- Drop adminLevel
ALTER TABLE "Token" DROP COLUMN "adminLevel";