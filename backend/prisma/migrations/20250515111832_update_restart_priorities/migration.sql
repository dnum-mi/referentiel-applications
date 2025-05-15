/*
  Warnings:

  - The values [p0,p1,p2,p3,p4,p5] on the enum `priorityRestart` will be removed. If these variants are still used in the database, this will fail.

*/
-- We need to create a temporary column to handle the mapping
ALTER TABLE "applications" ADD COLUMN "temp_priority" TEXT;

-- Update the temporary column with the new values
UPDATE "applications" SET "temp_priority" = 
  CASE "priorityRestart" 
    WHEN 'p0' THEN 'R0'
    WHEN 'p1' THEN 'R1'
    WHEN 'p2' THEN 'R2'
    WHEN 'p3' THEN 'R3'
    ELSE NULL
  END;

-- Set priorityRestart to NULL to avoid cast errors during enum update
UPDATE "applications" SET "priorityRestart" = NULL;

-- AlterEnum
BEGIN;
CREATE TYPE "priorityRestart_new" AS ENUM ('R0', 'R1', 'R1_STAR', 'R2', 'R3');
ALTER TABLE "applications" ALTER COLUMN "priorityRestart" TYPE "priorityRestart_new" USING NULL;
ALTER TYPE "priorityRestart" RENAME TO "priorityRestart_old";
ALTER TYPE "priorityRestart_new" RENAME TO "priorityRestart";
DROP TYPE "priorityRestart_old";
COMMIT;

-- Now update the priorityRestart column with the new values
UPDATE "applications" SET "priorityRestart" = "temp_priority"::"priorityRestart" 
WHERE "temp_priority" IS NOT NULL;

-- Drop the temporary column
ALTER TABLE "applications" DROP COLUMN "temp_priority";
