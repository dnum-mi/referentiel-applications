/*
  Warnings:

  - You are about to drop the column `tags` on the `Application` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Application" RENAME COLUMN "tags" TO "oldTags";

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tag_name_key" UNIQUE ("name")
);

-- CreateTable
CREATE TABLE "_ApplicationToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ApplicationToTag_B_index" ON "_ApplicationToTag"("B");

-- AddForeignKey
ALTER TABLE "_ApplicationToTag" ADD CONSTRAINT "_ApplicationToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationToTag" ADD CONSTRAINT "_ApplicationToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normalize Data from oldTags
UPDATE "Application" AS app
SET "oldTags" = ( 
    SELECT COALESCE(ARRAY(
    SELECT DISTINCT lower(btrim(tag))
    FROM unnest(app."oldTags") AS tag
    WHERE tag IS NOT NULL AND btrim(tag) <> ''
    ORDER BY 1
  ), ARRAY[]::text[])
)
WHERE app."oldTags" IS NOT NULL;

-- Insert unique tags into Tag table
INSERT INTO "Tag" ("id", "name")
SELECT gen_random_uuid(), t.name
FROM (
    SELECT DISTINCT unnest(app."oldTags") AS name
    FROM "Application" app
) t
WHERE t.name IS NOT NULL;

-- Create associations in _ApplicationToTag table
INSERT INTO "_ApplicationToTag" ("A", "B")
SELECT app."id" AS "A", tag."id" AS "B"
FROM "Application" AS app
CROSS JOIN LATERAL unnest(app."oldTags") AS tagName
JOIN "Tag" AS tag ON tag."name" = tagName
WHERE app."oldTags" IS NOT NULL
ON CONFLICT ("A", "B") DO NOTHING;

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "oldTags";
