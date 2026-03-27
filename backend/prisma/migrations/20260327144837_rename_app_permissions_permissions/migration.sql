
-- AlterTable
ALTER TABLE "AppPermissions" RENAME COLUMN "readBase" TO "AppRead";
ALTER TYPE "Permission" RENAME VALUE 'readBase' TO 'AppRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeBase" TO "AppWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeBase' TO 'AppWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "readActors" TO "ActorRead";
ALTER TYPE "Permission" RENAME VALUE 'readActors' TO 'ActorRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeActors" TO "ActorWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeActors' TO 'ActorWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "writePriorityRestart" TO "AppWritePriority";
ALTER TYPE "Permission" RENAME VALUE 'writePriorityRestart' TO 'AppWritePriority';
ALTER TABLE "AppPermissions" RENAME COLUMN "readCompliances" TO "ComplianceRead";
ALTER TYPE "Permission" RENAME VALUE 'readCompliances' TO 'ComplianceRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeCompliances" TO "ComplianceWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeCompliances' TO 'ComplianceWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "readHostings" TO "HostingRead";
ALTER TYPE "Permission" RENAME VALUE 'readHostings' TO 'HostingRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeHostings" TO "HostingWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeHostings' TO 'HostingWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "readMetadata" TO "MetadataRead";
ALTER TYPE "Permission" RENAME VALUE 'readMetadata' TO 'MetadataRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "readRelations" TO "RelationRead";
ALTER TYPE "Permission" RENAME VALUE 'readRelations' TO 'RelationRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeRelations" TO "RelationWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeRelations' TO 'RelationWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "readLinks" TO "LinkRead";
ALTER TYPE "Permission" RENAME VALUE 'readLinks' TO 'LinkRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "writeLinks" TO "LinkWrite";
ALTER TYPE "Permission" RENAME VALUE 'writeLinks' TO 'LinkWrite';
ALTER TABLE "AppPermissions" RENAME COLUMN "readReports" TO "ReportRead";
ALTER TYPE "Permission" RENAME VALUE 'readReports' TO 'ReportRead';
ALTER TABLE "AppPermissions" RENAME COLUMN "postReports" TO "ReportPost";
ALTER TYPE "Permission" RENAME VALUE 'postReports' TO 'ReportPost';
ALTER TABLE "AppPermissions" RENAME COLUMN "manageReports" TO "ReportManage";
ALTER TYPE "Permission" RENAME VALUE 'manageReports' TO 'ReportManage';

-- AlterEnum (global permissions)
ALTER TYPE "Permission" RENAME VALUE 'manageAdminPanel' TO 'AdminPanelManage';
ALTER TYPE "Permission" RENAME VALUE 'postActorType' TO 'ActorTypePost';
ALTER TYPE "Permission" RENAME VALUE 'manageActorType' TO 'ActorTypeManage';
ALTER TYPE "Permission" RENAME VALUE 'deleteActorType' TO 'ActorTypeDelete';
