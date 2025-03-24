-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT,
    "shortname" TEXT,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "labels" ("id", "source", "label", "shortname", "applicationId")
SELECT gen_random_uuid(), 'refApp', "label", "shortName", "id"
FROM "applications";

DROP INDEX IF EXISTS "applications_label_idx";  -- Suppression de l'index pour la colonne label
DROP INDEX IF EXISTS "applications_shortName_idx";  -- Suppression de l'index pour la colonne shortName

-- Suppression des colonnes `label` et `shortName` dans la table `applications`
ALTER TABLE "applications"
DROP COLUMN "label",
DROP COLUMN "shortName";