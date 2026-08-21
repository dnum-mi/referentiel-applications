-- AlterTable
ALTER TABLE "TechnologyStack" ADD COLUMN     "eoasDate" TIMESTAMP(3),
ADD COLUMN     "eolProduct" VARCHAR(100),
ADD COLUMN     "latestVersion" VARCHAR(50);
