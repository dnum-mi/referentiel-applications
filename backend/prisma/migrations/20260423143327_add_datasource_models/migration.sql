-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "dataSourceId" TEXT;

-- CreateTable
CREATE TABLE "DataSourceType" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,

    CONSTRAINT "DataSourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensibility" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "color" VARCHAR(50),

    CONSTRAINT "Sensibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateFrequency" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,

    CONSTRAINT "UpdateFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isReference" BOOLEAN NOT NULL DEFAULT false,
    "example" TEXT,
    "conservation" VARCHAR(100),
    "databaseName" VARCHAR(255),
    "databaseTableName" VARCHAR(255),
    "fieldCount" INTEGER,
    "fields" TEXT,
    "volumetry" INTEGER,
    "monthlyVolumetry" INTEGER,
    "applicationId" TEXT NOT NULL,
    "typeId" TEXT,
    "sensibilityId" TEXT,
    "updateFrequencyId" TEXT,
    "familyId" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataSourceType_label_key" ON "DataSourceType"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Sensibility_label_key" ON "Sensibility"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Family_label_key" ON "Family"("label");

-- CreateIndex
CREATE UNIQUE INDEX "UpdateFrequency_label_key" ON "UpdateFrequency"("label");

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DataSourceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_sensibilityId_fkey" FOREIGN KEY ("sensibilityId") REFERENCES "Sensibility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_updateFrequencyId_fkey" FOREIGN KEY ("updateFrequencyId") REFERENCES "UpdateFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
