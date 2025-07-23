-- CreateTable
CREATE TABLE "AppPermissions" (
    "readBase" BOOLEAN NOT NULL,
    "writeBase" BOOLEAN NOT NULL,
    "readActors" BOOLEAN NOT NULL,
    "writeActors" BOOLEAN NOT NULL,
    "readCompliances" BOOLEAN NOT NULL,
    "writeCompliances" BOOLEAN NOT NULL,
    "readHostings" BOOLEAN NOT NULL,
    "writeHostings" BOOLEAN NOT NULL,
    "readMetadata" BOOLEAN NOT NULL,
    "writeMetadata" BOOLEAN NOT NULL,
    "readRelations" BOOLEAN NOT NULL,
    "writeRelations" BOOLEAN NOT NULL,
    "readLinks" BOOLEAN NOT NULL,
    "writeLinks" BOOLEAN NOT NULL,
    "actorTypeId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppPermissions_actorTypeId_key" ON "AppPermissions"("actorTypeId");

-- AddForeignKey
ALTER TABLE "AppPermissions" ADD CONSTRAINT "AppPermissions_actorTypeId_fkey" FOREIGN KEY ("actorTypeId") REFERENCES "actorTypes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- for each existing actorType, create a default AppPermissions entry with read permissions set to true and write permissions set to false
INSERT INTO "AppPermissions" ("readBase", "writeBase", "readActors", "writeActors", "readCompliances", "writeCompliances", "readHostings", "writeHostings", "readMetadata", "writeMetadata", "readRelations", "writeRelations", "readLinks", "writeLinks", "actorTypeId")
SELECT true, false, true, false, true, false, true, false, true, false, true, false, true, false, "id"
FROM "actorTypes";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "permissions" DROP DEFAULT;