-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('under_construction', 'in_production', 'decommissioned', 'decommissioning');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "type" "EventType" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "metadataId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
