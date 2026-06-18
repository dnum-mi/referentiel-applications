-- CreateTable
CREATE TABLE "MditCampaign" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MditCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MditCampaign_year_key" ON "MditCampaign"("year");

-- CreateIndex
CREATE INDEX "MditCampaign_year_idx" ON "MditCampaign"("year" DESC);
