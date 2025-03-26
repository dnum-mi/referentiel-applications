-- Migrer les données depuis la table "applications" vers "labels", y compris les "metadataId"
INSERT INTO "labels" ("id", "source", "label", "shortname", "metadataId", "applicationId")
SELECT 
    gen_random_uuid(), 
    'https://referentiel-applications.interieur.rie.gouv.fr/applications', 
    "label", 
    "shortName", 
    "metadataId",
    "id" 
FROM "applications";

DROP INDEX IF EXISTS "applications_label_idx";  -- Suppression de l'index pour la colonne label
DROP INDEX IF EXISTS "applications_shortName_idx";  -- Suppression de l'index pour la colonne shortName

-- Suppression des colonnes `label` et `shortName` dans la table `applications`
ALTER TABLE "applications"
DROP COLUMN "label",
DROP COLUMN "shortName";