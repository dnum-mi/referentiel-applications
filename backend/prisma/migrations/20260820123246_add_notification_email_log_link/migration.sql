-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailLogId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "EmailLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
