-- CreateTable (nouvelle relation n-n DataDescription <-> DataFamily)
CREATE TABLE "_DataDescriptionToDataFamily" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DataDescriptionToDataFamily_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DataDescriptionToDataFamily_B_index" ON "_DataDescriptionToDataFamily"("B");

-- AddForeignKey
ALTER TABLE "_DataDescriptionToDataFamily" ADD CONSTRAINT "_DataDescriptionToDataFamily_A_fkey" FOREIGN KEY ("A") REFERENCES "DataDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DataDescriptionToDataFamily" ADD CONSTRAINT "_DataDescriptionToDataFamily_B_fkey" FOREIGN KEY ("B") REFERENCES "DataFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : préserve la famille actuelle de chaque DataDescription dans la nouvelle relation
-- multiple, avant de supprimer l'ancienne colonne scalaire "familyId".
INSERT INTO "_DataDescriptionToDataFamily" ("A", "B")
SELECT "id", "familyId" FROM "DataDescription" WHERE "familyId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "DataDescription" DROP CONSTRAINT "DataDescription_familyId_fkey";

-- AlterTable
ALTER TABLE "DataDescription" DROP COLUMN "familyId";
