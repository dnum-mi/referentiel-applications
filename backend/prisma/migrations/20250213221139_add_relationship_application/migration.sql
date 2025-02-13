-- Création de l'enum et de la table
CREATE TYPE "RelationType" AS ENUM ('is_part_of', 'in_replacement_of', 'is_service_user_of', 'is_data_user_of');

CREATE TABLE "relations" (
    "type_relation" "RelationType" NOT NULL,
    "application_source" TEXT NOT NULL,
    "application_cible" TEXT NOT NULL,
    CONSTRAINT "relations_pkey" PRIMARY KEY ("application_source","application_cible","type_relation")
);

-- Ajout des clés étrangères
ALTER TABLE "relations" ADD CONSTRAINT "relations_application_source_fkey" FOREIGN KEY ("application_source") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "relations" ADD CONSTRAINT "relations_application_cible_fkey" FOREIGN KEY ("application_cible") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration des données existantes
INSERT INTO "relations" ("application_source", "application_cible", "type_relation")
SELECT id, "parentId", 'is_part_of' FROM "applications" WHERE "parentId" IS NOT NULL;

-- Suppression de l'ancienne relation parent
ALTER TABLE "applications" DROP CONSTRAINT "ApplicationParent";

-- Suppression de la colonne parentId
ALTER TABLE "applications" DROP COLUMN "parentId";