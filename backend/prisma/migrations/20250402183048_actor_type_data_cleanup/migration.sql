BEGIN;

-- Crée le nouveau type enum
CREATE TYPE "ActorType_new" AS ENUM (
  'MOA',
  'MOE',
  'RSSI',
  'ArchitecteApplicatif',
  'ArchitecteTechnique',
  'TMA',
  'Exploitation',
  'RSIMM',
  'CPD',
  'OrganismeBeneficiaire',
  'ProductOwner',
  'ProductManager',
  'Hebergement',
  'Autre'
);

-- Cast temporaire de la colonne vers TEXT pour pouvoir modifier les données
ALTER TABLE "actors" ALTER COLUMN "type" TYPE TEXT;

-- Mise à jour des données
UPDATE "actors" SET "type" = 'MOA' WHERE "type" = 'Responsable';
UPDATE "actors" SET "type" = 'MOE' WHERE "type" = 'ResponsableAutre';
UPDATE "actors" SET "type" = 'RSSI' WHERE "type" = 'RepresentantSSI';
UPDATE "actors" SET "type" = 'ArchitecteTechnique' WHERE "type" = 'ArchitecteInfra';

-- Recast de la colonne vers le nouveau enum
ALTER TABLE "actors" ALTER COLUMN "type" TYPE "ActorType_new" USING ("type"::text::"ActorType_new");

-- Remplace l'ancien enum par le nouveau
ALTER TYPE "ActorType" RENAME TO "ActorType_old";
ALTER TYPE "ActorType_new" RENAME TO "ActorType";
DROP TYPE "ActorType_old";

COMMIT;