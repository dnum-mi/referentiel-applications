-- AlterTable
ALTER TABLE "Actor" RENAME CONSTRAINT "actors_pkey" TO "Actor_pkey";

-- AlterTable
ALTER TABLE "ActorType" RENAME CONSTRAINT "actorTypes_pkey" TO "ActorType_pkey";

-- AlterTable
ALTER TABLE "AnomalyNotification" RENAME CONSTRAINT "anomalyNotification_pkey" TO "AnomalyNotification_pkey";

-- AlterTable
ALTER TABLE "AnomalyNotificationHistory" RENAME CONSTRAINT "anomalyNotificationHistory_pkey" TO "AnomalyNotificationHistory_pkey";

-- AlterTable
ALTER TABLE "Application" RENAME CONSTRAINT "applications_pkey" TO "Application_pkey";

-- AlterTable
ALTER TABLE "Compliance" RENAME CONSTRAINT "compliances_pkey" TO "Compliance_pkey";

-- AlterTable
ALTER TABLE "Label" RENAME CONSTRAINT "labels_pkey" TO "Label_pkey";

-- AlterTable
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_pkey" TO "Metadata_pkey";

-- AlterTable
ALTER TABLE "Relation" RENAME CONSTRAINT "relations_pkey" TO "Relation_pkey";

-- AlterTable
ALTER TABLE "Stats" RENAME CONSTRAINT "stats_pkey" TO "Stats_pkey";

-- RenameForeignKey
ALTER TABLE "Actor" RENAME CONSTRAINT "actors_actorTypeId_fkey" TO "Actor_actorTypeId_fkey";

-- RenameForeignKey
ALTER TABLE "Actor" RENAME CONSTRAINT "actors_applicationId_fkey" TO "Actor_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "Actor" RENAME CONSTRAINT "actors_organizationId_fkey" TO "Actor_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "AnomalyNotification" RENAME CONSTRAINT "anomalyNotification_applicationId_fkey" TO "AnomalyNotification_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "AnomalyNotification" RENAME CONSTRAINT "anomalyNotification_notifierId_fkey" TO "AnomalyNotification_notifierId_fkey";

-- RenameForeignKey
ALTER TABLE "AnomalyNotificationHistory" RENAME CONSTRAINT "anomalyNotificationHistory_issueNotificationId_fkey" TO "AnomalyNotificationHistory_issueNotificationId_fkey";

-- RenameForeignKey
ALTER TABLE "Application" RENAME CONSTRAINT "applications_ownerId_fkey" TO "Application_ownerId_fkey";

-- RenameForeignKey
ALTER TABLE "Compliance" RENAME CONSTRAINT "compliances_applicationId_fkey" TO "Compliance_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "Compliance" RENAME CONSTRAINT "compliances_homologation_rssi_id_fkey" TO "Compliance_homologation_rssi_id_fkey";

-- RenameForeignKey
ALTER TABLE "Label" RENAME CONSTRAINT "labels_applicationId_fkey" TO "Label_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_actorId_fkey" TO "Metadata_actorId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_applicationId_fkey" TO "Metadata_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_complianceId_fkey" TO "Metadata_complianceId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_createdById_fkey" TO "Metadata_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_dataOwnerId_fkey" TO "Metadata_dataOwnerId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_externalRessourceId_fkey" TO "Metadata_externalRessourceId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_hostingId_fkey" TO "Metadata_hostingId_fkey";

-- RenameForeignKey
ALTER TABLE "Metadata" RENAME CONSTRAINT "metadata_labelId_fkey" TO "Metadata_labelId_fkey";

-- RenameForeignKey
ALTER TABLE "Relation" RENAME CONSTRAINT "relations_applicationSource_fkey" TO "Relation_applicationSourceId_fkey";

-- RenameForeignKey
ALTER TABLE "Relation" RENAME CONSTRAINT "relations_applicationTarget_fkey" TO "Relation_applicationTargetId_fkey";

-- RenameForeignKey
ALTER TABLE "User" RENAME CONSTRAINT "users_organizationId_fkey" TO "User_organizationId_fkey";

-- RenameIndex
ALTER INDEX "actors_applicationId_actorTypeId_idx" RENAME TO "Actor_applicationId_actorTypeId_idx";

-- RenameIndex
ALTER INDEX "actorTypes_code_key" RENAME TO "ActorType_code_key";

-- RenameIndex
ALTER INDEX "applications_label_description_key" RENAME TO "Application_label_description_key";

-- RenameIndex
ALTER INDEX "applications_label_idx" RENAME TO "Application_label_idx";

-- RenameIndex
ALTER INDEX "applications_shortName_idx" RENAME TO "Application_shortName_idx";

-- RenameIndex
ALTER INDEX "compliances_applicationId_key" RENAME TO "Compliance_applicationId_key";

-- RenameIndex
ALTER INDEX "relations_applicationSource_applicationTarget_type_key" RENAME TO "Relation_applicationSourceId_applicationTargetId_type_key";

-- RenameIndex
ALTER INDEX "stats_date_type_key" RENAME TO "Stats_date_type_key";

-- RenameIndex
ALTER INDEX "users_email_key" RENAME TO "User_email_key";

-- RenameIndex
ALTER INDEX "users_id_key" RENAME TO "User_id_key";

-- RenameIndex
ALTER INDEX "users_keycloakId_key" RENAME TO "User_keycloakId_key";
