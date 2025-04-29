-- AlterTable
ALTER TABLE "Hosting" ADD COLUMN     "platformId" TEXT;

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "providerId" TEXT NOT NULL,
    "hostingSiteId" TEXT NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "room" TEXT,
    "description" TEXT,

    CONSTRAINT "HostingSite_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_hostingSiteId_fkey" FOREIGN KEY ("hostingSiteId") REFERENCES "HostingSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "applications_label_description_unique" RENAME TO "applications_label_description_key";
