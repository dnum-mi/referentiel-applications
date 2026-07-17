-- Retrait de la fonctionnalité « Licences » (#2016 / #2026).
-- On supprime d'abord la relation Metadata → License (contrainte + colonne),
-- puis la table License elle-même (sa FK vers Application part avec la table).
ALTER TABLE "Metadata" DROP CONSTRAINT IF EXISTS "Metadata_licenseId_fkey";
ALTER TABLE "Metadata" DROP COLUMN IF EXISTS "licenseId";
DROP TABLE IF EXISTS "License";
