-- AlterTable
ALTER TABLE "Report" RENAME CONSTRAINT "AnomalyNotification_pkey" TO "Report_pkey";

-- AlterTable
ALTER TABLE "ReportHistory" RENAME CONSTRAINT "AnomalyNotificationHistory_pkey" TO "ReportHistory_pkey";

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR(100) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_applicationId_sentAt_idx" ON "NotificationLog"("applicationId", "sentAt");

-- RenameForeignKey
ALTER TABLE "Report" RENAME CONSTRAINT "AnomalyNotification_applicationId_fkey" TO "Report_applicationId_fkey";

-- RenameForeignKey
ALTER TABLE "Report" RENAME CONSTRAINT "AnomalyNotification_notifierId_fkey" TO "Report_notifierId_fkey";

-- RenameForeignKey
ALTER TABLE "ReportHistory" RENAME CONSTRAINT "AnomalyNotificationHistory_issueNotificationId_fkey" TO "ReportHistory_reportId_fkey";

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
