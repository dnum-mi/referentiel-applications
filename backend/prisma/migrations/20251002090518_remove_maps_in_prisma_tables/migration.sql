-- Rename tables to follow Prisma naming conventions (PascalCase)

-- Rename anomaly tables
ALTER TABLE "anomalyNotification" RENAME TO "AnomalyNotification";
ALTER TABLE "anomalyNotificationHistory" RENAME TO "AnomalyNotificationHistory";

-- Rename user-related tables
ALTER TABLE "users" RENAME TO "User";
ALTER TABLE "actors" RENAME TO "Actor";
ALTER TABLE "actorTypes" RENAME TO "ActorType";

-- Rename compliance table
ALTER TABLE "compliances" RENAME TO "Compliance";

-- Rename application-related tables
ALTER TABLE "applications" RENAME TO "Application";
ALTER TABLE "relations" RENAME TO "Relation";

-- Rename other tables
ALTER TABLE "metadata" RENAME TO "Metadata";
ALTER TABLE "stats" RENAME TO "Stats";
ALTER TABLE "labels" RENAME TO "Label";

-- Rename columns in Relation table to match the field names without @map
ALTER TABLE "Relation" RENAME COLUMN "applicationSource" TO "applicationSourceId";
ALTER TABLE "Relation" RENAME COLUMN "applicationTarget" TO "applicationTargetId";