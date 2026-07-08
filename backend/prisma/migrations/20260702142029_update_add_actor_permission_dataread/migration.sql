-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'DataRead';

-- AlterTable
ALTER TABLE "AppPermissions" ADD COLUMN     "DataRead" BOOLEAN NOT NULL DEFAULT false;
