-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'campaign_quality_reminder';

-- CreateTable
CREATE TABLE "QualityCampaign" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "filters" JSONB NOT NULL,
    "message" TEXT,
    "sponsorEmail" VARCHAR(255),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityCampaignTarget" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "iqAtStart" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityCampaignTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCampaignTarget_campaignId_applicationId_key" ON "QualityCampaignTarget"("campaignId", "applicationId");

-- AddForeignKey
ALTER TABLE "QualityCampaign" ADD CONSTRAINT "QualityCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCampaignTarget" ADD CONSTRAINT "QualityCampaignTarget_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "QualityCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCampaignTarget" ADD CONSTRAINT "QualityCampaignTarget_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
