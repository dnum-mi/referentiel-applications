-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'DataWrite';

-- AlterTable
ALTER TABLE "AppPermissions" ADD COLUMN     "DataWrite" BOOLEAN NOT NULL DEFAULT true;
