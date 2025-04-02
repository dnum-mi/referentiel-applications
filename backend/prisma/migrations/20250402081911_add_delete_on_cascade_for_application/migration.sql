-- DropForeignKey
ALTER TABLE "ExternalRessource" DROP CONSTRAINT "ExternalRessource_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "Hosting" DROP CONSTRAINT "Hosting_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "actors" DROP CONSTRAINT "actors_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "anomalyNotification" DROP CONSTRAINT "anomalyNotification_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "compliances" DROP CONSTRAINT "compliances_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "labels" DROP CONSTRAINT "labels_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "relations" DROP CONSTRAINT "relations_applicationSource_fkey";

-- DropForeignKey
ALTER TABLE "relations" DROP CONSTRAINT "relations_applicationTarget_fkey";

-- AddForeignKey
ALTER TABLE "anomalyNotification" ADD CONSTRAINT "anomalyNotification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationSource_fkey" FOREIGN KEY ("applicationSource") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relations" ADD CONSTRAINT "relations_applicationTarget_fkey" FOREIGN KEY ("applicationTarget") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliances" ADD CONSTRAINT "compliances_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalRessource" ADD CONSTRAINT "ExternalRessource_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
