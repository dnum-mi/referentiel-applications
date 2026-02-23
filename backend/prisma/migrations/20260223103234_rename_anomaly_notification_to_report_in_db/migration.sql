/*
  Warnings:

  - The values [CreateGlobalAnomalyNotification] on the enum `CapabilityNames` will be removed. This migration converts them to CreateGlobalReport before the enum swap.

*/
-- Create new ReportStatus enum
CREATE TYPE "ReportStatus" AS ENUM ('in_pending', 'in_progress', 'done');

-- Update CapabilityNames enum
CREATE TYPE "CapabilityNames_new" AS ENUM ('CreateApplication', 'CreateGlobalReport');
ALTER TABLE "User" ALTER COLUMN "capabilities" TYPE "CapabilityNames_new"[]
  USING (
    replace("capabilities"::text, 'CreateGlobalAnomalyNotification', 'CreateGlobalReport')::"CapabilityNames_new"[]
  );
ALTER TYPE "CapabilityNames" RENAME TO "CapabilityNames_old";
ALTER TYPE "CapabilityNames_new" RENAME TO "CapabilityNames";
DROP TYPE "CapabilityNames_old";

-- Rename columns in AppPermissions table
ALTER TABLE "AppPermissions" RENAME COLUMN "readAnomalyNotifications" TO "readReports";
ALTER TABLE "AppPermissions" RENAME COLUMN "postAnomalyNotifications" TO "postReports";
ALTER TABLE "AppPermissions" RENAME COLUMN "manageAnomalyNotifications" TO "manageReports";

-- Update status column type and rename columns in AnomalyNotificationHistory before table rename
ALTER TABLE "AnomalyNotificationHistory" RENAME COLUMN "issueNotificationId" TO "reportId";

-- Update status column in AnomalyNotification to use new enum
-- First, drop the default and change the type
ALTER TABLE "AnomalyNotification" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AnomalyNotification" ALTER COLUMN "status" TYPE "ReportStatus" USING ("status"::text::"ReportStatus");
ALTER TABLE "AnomalyNotification" ALTER COLUMN "status" SET DEFAULT 'in_pending'::"ReportStatus";

-- Update status column in AnomalyNotificationHistory to use new enum
ALTER TABLE "AnomalyNotificationHistory" ALTER COLUMN "status" TYPE "ReportStatus" USING ("status"::text::"ReportStatus");

-- Drop old enum
DROP TYPE "AnomalyNotificationStatus";

-- Rename tables
ALTER TABLE "AnomalyNotification" RENAME TO "Report";
ALTER TABLE "AnomalyNotificationHistory" RENAME TO "ReportHistory";
