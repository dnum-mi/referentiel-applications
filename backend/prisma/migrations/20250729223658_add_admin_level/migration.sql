/*
  Warnings:

  - A unique constraint covering the columns `[applicationId]` on the table `compliances` will be added. If there are existing duplicate values, this will fail.
  - Made the column `applicationId` on table `compliances` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "compliances" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminLevel" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "compliances_applicationId_key" ON "compliances"("applicationId");

-- For each user, if the permissions contains "admin" set the adminLevel to 30
-- if it contains "write" set it to 20
-- if it contains "read" set it to 10
UPDATE "users"
SET "adminLevel" = CASE
    WHEN "permissions" LIKE '%admin%' THEN 30
    WHEN "permissions" LIKE '%write%' THEN 20
    WHEN "permissions" LIKE '%read%' THEN 10
    ELSE 0
  END;

-- Drop the permissions column
ALTER TABLE "users" DROP COLUMN "permissions";