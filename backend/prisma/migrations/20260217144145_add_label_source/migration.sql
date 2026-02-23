-- CreateTable
CREATE TABLE "LabelSource" (
    "id" TEXT NOT NULL,
    "source" VARCHAR(255) NOT NULL,

    CONSTRAINT "LabelSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelSource_source_key" ON "LabelSource"("source");

-- AddForeignKey
ALTER TABLE "Label" ADD COLUMN "labelSourceId" TEXT;

-- InsertExistingDatas
INSERT INTO "LabelSource" ("id", "source")
SELECT gen_random_uuid(), s."source"
FROM (
    SELECT DISTINCT "source"
    FROM "Label"
    WHERE "source" IS NOT NULL
) s;

-- LinkLabelToSource
UPDATE "Label" l
SET "labelSourceId" = ls.id
FROM "LabelSource" ls
WHERE l."source" = ls."source";

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_labelSourceId_fkey" FOREIGN KEY ("labelSourceId") REFERENCES "LabelSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "Label"
DROP COLUMN "source";
