-- CreateEnum
CREATE TYPE "QualityCampaignStatus" AS ENUM ('scheduled', 'in_progress', 'done');

-- AlterTable
ALTER TABLE "QualityCampaign" ADD COLUMN     "status" "QualityCampaignStatus" NOT NULL DEFAULT 'scheduled';

-- CreateTable
CREATE TABLE "QualityCampaignActionLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityCampaignActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCampaignActionLog_campaignId_applicationId_actionKey_key" ON "QualityCampaignActionLog"("campaignId", "applicationId", "actionKey");

-- AddForeignKey
ALTER TABLE "QualityCampaignActionLog" ADD CONSTRAINT "QualityCampaignActionLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "QualityCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCampaignActionLog" ADD CONSTRAINT "QualityCampaignActionLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCampaignActionLog" ADD CONSTRAINT "QualityCampaignActionLog_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
