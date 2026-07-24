/*
  Warnings:

  - You are about to drop the column `businessDivisionId` on the `Application` table. All the data in the column will be migrated to the new `_ApplicationToBusinessDivision` join table before the column is dropped.

*/
-- CreateTable
CREATE TABLE "_ApplicationToBusinessDivision" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationToBusinessDivision_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ApplicationToBusinessDivision_B_index" ON "_ApplicationToBusinessDivision"("B");

-- AddForeignKey
ALTER TABLE "_ApplicationToBusinessDivision" ADD CONSTRAINT "_ApplicationToBusinessDivision_A_fkey" FOREIGN KEY ("A") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationToBusinessDivision" ADD CONSTRAINT "_ApplicationToBusinessDivision_B_fkey" FOREIGN KEY ("B") REFERENCES "BusinessDivision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single business division per application into the join table
INSERT INTO "_ApplicationToBusinessDivision" ("A", "B")
SELECT "id", "businessDivisionId"
FROM "Application"
WHERE "businessDivisionId" IS NOT NULL
ON CONFLICT ("A", "B") DO NOTHING;

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_businessDivisionId_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "businessDivisionId";
