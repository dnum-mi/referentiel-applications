-- AlterEnum
ALTER TYPE "MetadataAction" ADD VALUE 'export';

-- AlterTable
ALTER TABLE "Metadata" ALTER COLUMN "applicationId" DROP NOT NULL;
