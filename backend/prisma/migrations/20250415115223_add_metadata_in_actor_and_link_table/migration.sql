-- AlterTable
ALTER TABLE "ExternalRessource" ADD COLUMN     "metadataId" TEXT;

-- AlterTable
ALTER TABLE "actors" ADD COLUMN     "metadataId" TEXT;

-- AddForeignKey
ALTER TABLE "ExternalRessource" ADD CONSTRAINT "ExternalRessource_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "metadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
