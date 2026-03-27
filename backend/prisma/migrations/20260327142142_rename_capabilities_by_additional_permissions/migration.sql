-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CreateApplication', 'DeleteApplication', 'CreateGlobalReport', 'AppList', 'DataExport', 'manageAdminPanel', 'postActorType', 'manageActorType', 'deleteActorType', 'readBase', 'writeBase', 'readActors', 'writeActors', 'readCompliances', 'writeCompliances', 'readHostings', 'writeHostings', 'readRelations', 'writeRelations', 'readLinks', 'writeLinks', 'writePriorityRestart', 'readMetadata', 'readReports', 'postReports', 'manageReports');

-- RenameColumn
ALTER TABLE "User" RENAME COLUMN "capabilities" TO "additionalPermissions";

-- AlterColumn: cast from CapabilityNames[] to Permission[]
ALTER TABLE "User" ALTER COLUMN "additionalPermissions" TYPE "Permission"[] USING "additionalPermissions"::text[]::"Permission"[];
