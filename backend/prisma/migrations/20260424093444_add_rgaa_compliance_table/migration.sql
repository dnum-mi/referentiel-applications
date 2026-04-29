-- CreateTable
CREATE TABLE "RgaaCompliance" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "audit_date" TIMESTAMP(3),
    "service_url" TEXT,
    "accessibility_url" TEXT,
    "score_percentage" DECIMAL(5,2),

    CONSTRAINT "RgaaCompliance_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy RGAA data from Compliance to RgaaCompliance
INSERT INTO "RgaaCompliance" (
    "id",
    "applicationId",
    "audit_date",
    "service_url",
    "accessibility_url",
    "score_percentage"
)
SELECT
    "id",
    "applicationId",
    "rgaa_audit_date",
    "rgaa_service_url",
    "rgaa_accessibility_url",
    "rgaa_score_percentage"
FROM "Compliance"
WHERE
    "rgaa_audit_date" IS NOT NULL
    OR "rgaa_service_url" IS NOT NULL
    OR "rgaa_accessibility_url" IS NOT NULL
    OR "rgaa_score_percentage" IS NOT NULL;

-- Drop legacy RGAA columns from Compliance
ALTER TABLE "Compliance"
DROP COLUMN "rgaa_audit_date",
DROP COLUMN "rgaa_service_url",
DROP COLUMN "rgaa_accessibility_url",
DROP COLUMN "rgaa_score_percentage";

-- CreateIndex
CREATE INDEX "RgaaCompliance_applicationId_idx" ON "RgaaCompliance"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RgaaCompliance_applicationId_service_url_key" ON "RgaaCompliance"("applicationId", "service_url");

-- AddForeignKey
ALTER TABLE "RgaaCompliance" ADD CONSTRAINT "RgaaCompliance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
