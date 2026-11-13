-- CreateEnum
CREATE TYPE "SbomImportStatus" AS ENUM ('preview', 'committed', 'unchanged');

-- CreateTable
CREATE TABLE "SbomSource" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "context" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "currentImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SbomSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbomImport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" VARCHAR(160) NOT NULL,
    "context" VARCHAR(500),
    "projectVersion" VARCHAR(255),
    "format" TEXT NOT NULL,
    "specVersion" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "baseRevision" INTEGER NOT NULL,
    "status" "SbomImportStatus" NOT NULL DEFAULT 'preview',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),
    "committedBy" TEXT,
    "resultRevision" INTEGER,
    "componentCount" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "report" JSONB NOT NULL,

    CONSTRAINT "SbomImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbomComponent" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT,
    "purl" TEXT,
    "ecosystem" TEXT,
    "type" TEXT NOT NULL,
    "identificationStatus" TEXT NOT NULL,

    CONSTRAINT "SbomComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbomInventory" (
    "applicationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SbomInventory_pkey" PRIMARY KEY ("applicationId")
);

-- CreateTable
CREATE TABLE "InventoryEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'inventory.changed',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SbomSource_currentImportId_key" ON "SbomSource"("currentImportId");

-- CreateIndex
CREATE INDEX "SbomSource_applicationId_active_idx" ON "SbomSource"("applicationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SbomSource_applicationId_name_key" ON "SbomSource"("applicationId", "name");

-- CreateIndex
CREATE INDEX "SbomImport_applicationId_sourceName_createdAt_idx" ON "SbomImport"("applicationId", "sourceName", "createdAt");

-- CreateIndex
CREATE INDEX "SbomImport_status_expiresAt_idx" ON "SbomImport"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SbomComponent_product_idx" ON "SbomComponent"("product");

-- CreateIndex
CREATE UNIQUE INDEX "SbomComponent_importId_ref_key" ON "SbomComponent"("importId", "ref");

-- CreateIndex
CREATE INDEX "InventoryEvent_processedAt_createdAt_idx" ON "InventoryEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEvent_applicationId_revision_key" ON "InventoryEvent"("applicationId", "revision");

-- AddForeignKey
ALTER TABLE "SbomSource" ADD CONSTRAINT "SbomSource_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomSource" ADD CONSTRAINT "SbomSource_currentImportId_fkey" FOREIGN KEY ("currentImportId") REFERENCES "SbomImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomImport" ADD CONSTRAINT "SbomImport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomImport" ADD CONSTRAINT "SbomImport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SbomSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomComponent" ADD CONSTRAINT "SbomComponent_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SbomImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomInventory" ADD CONSTRAINT "SbomInventory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
