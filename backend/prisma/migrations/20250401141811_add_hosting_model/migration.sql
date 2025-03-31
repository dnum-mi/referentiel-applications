-- CreateEnum
CREATE TYPE "Nature" AS ENUM ('NON_DEFINIE', 'PHYSIQUE', 'VIRTUEL', 'CLOUD', 'BARRE_METAL');

-- CreateTable
CREATE TABLE "Hosting" (
    "id" TEXT NOT NULL,
    "provider" TEXT,
    "label" TEXT,
    "region" TEXT,
    "site" TEXT,
    "nature" "Nature",
    "platform" TEXT,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "Hosting_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
