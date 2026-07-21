-- CreateTable
CREATE TABLE "FeatureFlagLog" (
    "id" TEXT NOT NULL,
    "flagKey" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureFlagLog_flagKey_changedAt_idx" ON "FeatureFlagLog"("flagKey", "changedAt" DESC);

-- AddForeignKey
ALTER TABLE "FeatureFlagLog" ADD CONSTRAINT "FeatureFlagLog_flagKey_fkey" FOREIGN KEY ("flagKey") REFERENCES "FeatureFlag"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagLog" ADD CONSTRAINT "FeatureFlagLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
