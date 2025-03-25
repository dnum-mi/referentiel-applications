-- AlterTable
ALTER TABLE "relations"
ADD COLUMN "id" TEXT;


UPDATE "relations"
SET "id" = gen_random_uuid()
WHERE "id" IS NULL;

ALTER TABLE "relations"
DROP CONSTRAINT "relations_pkey",
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "relations_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "relations_applicationSource_applicationTarget_type_key"
ON "relations"("applicationSource", "applicationTarget", "type");