-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT,
    "shortname" TEXT,
    "metadataId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

