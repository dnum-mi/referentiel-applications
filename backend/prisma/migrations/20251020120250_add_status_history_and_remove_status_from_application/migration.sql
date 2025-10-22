-- CreateTable: Create ApplicationStatus table
CREATE TABLE "ApplicationStatus" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "statusDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatus_pkey" PRIMARY KEY ("id")
);

-- Add POC status to the Status enum
ALTER TYPE "Status" ADD VALUE 'poc' AFTER 'under_construction';

-- CreateIndexes
CREATE INDEX "ApplicationStatus_applicationId_idx" ON "ApplicationStatus"("applicationId");
CREATE INDEX "ApplicationStatus_statusDate_idx" ON "ApplicationStatus"("statusDate");
CREATE INDEX "ApplicationStatus_createdAt_idx" ON "ApplicationStatus"("createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationStatus" ADD CONSTRAINT "ApplicationStatus_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing application statuses to the new ApplicationStatus table
-- This creates an initial status record for each application with their current status
INSERT INTO "ApplicationStatus" ("id", "applicationId", "status", "statusDate", "createdAt")
SELECT 
    gen_random_uuid(),
    "id",
    "status",
    NULL,
    CURRENT_TIMESTAMP
FROM "Application";

-- AddColumn: Add currentStatusId to Application table
-- This FK will point to the current ApplicationStatus record
ALTER TABLE "Application" ADD COLUMN "currentStatusId" TEXT;

-- CreateIndex
CREATE INDEX "Application_currentStatusId_idx" ON "Application"("currentStatusId");

-- Populate currentStatusId with the ApplicationStatus records we just created
UPDATE "Application" SET "currentStatusId" = (
    SELECT "ApplicationStatus"."id"
    FROM "ApplicationStatus"
    WHERE "ApplicationStatus"."applicationId" = "Application"."id"
    LIMIT 1
);

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "ApplicationStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn: Remove old status column from Application table
-- The status history is now in the ApplicationStatus table, and current status is referenced via currentStatusId
ALTER TABLE "Application" DROP COLUMN "status";
