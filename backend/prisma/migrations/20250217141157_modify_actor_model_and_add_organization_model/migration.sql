-- AlterTable
ALTER TABLE "actors" ADD COLUMN     "firstname" TEXT,
ADD COLUMN     "lastname" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "sigle" TEXT,
    "parentId" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
