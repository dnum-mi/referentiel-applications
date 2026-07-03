-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "licenseId" TEXT,
ADD COLUMN     "technologyStackId" TEXT;

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" VARCHAR(50),

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnologyStack" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "version" VARCHAR(50),
    "eolDate" TIMESTAMP(3),
    "eolCheckedAt" TIMESTAMP(3),

    CONSTRAINT "TechnologyStack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "License_applicationId_idx" ON "License"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "License_applicationId_name_key" ON "License"("applicationId", "name");

-- CreateIndex
CREATE INDEX "TechnologyStack_applicationId_idx" ON "TechnologyStack"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnologyStack_applicationId_technology_key" ON "TechnologyStack"("applicationId", "technology");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_technologyStackId_fkey" FOREIGN KEY ("technologyStackId") REFERENCES "TechnologyStack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyStack" ADD CONSTRAINT "TechnologyStack_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

