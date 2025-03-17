-- Step 1: Create ENUM type first (with idempotency)
DO $$ BEGIN
    CREATE TYPE "RelationType" AS ENUM ('is_part_of', 'in_replacement_of', 'is_service_user_of', 'is_data_user_of');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create relations table
CREATE TABLE "relations" (
    "type" "RelationType" NOT NULL,
    "applicationSource" TEXT NOT NULL,
    "applicationTarget" TEXT NOT NULL,

    CONSTRAINT "relations_pkey" PRIMARY KEY ("applicationSource", "applicationTarget", "type")
);

-- Step 3: Add foreign key constraints
ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationSource_fkey"
  FOREIGN KEY ("applicationSource") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationTarget_fkey"
  FOREIGN KEY ("applicationTarget") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Populate relations table from applications (now safe)
INSERT INTO "relations" ("applicationSource", "applicationTarget", "type")
SELECT "id", "parentId", 'is_part_of'
FROM "applications"
WHERE "parentId" IS NOT NULL;


-- Step 5: Drop constraints and columns (cleanup)
ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "applications_parentId_fkey";
ALTER TABLE "applications" DROP COLUMN IF EXISTS "parentId";