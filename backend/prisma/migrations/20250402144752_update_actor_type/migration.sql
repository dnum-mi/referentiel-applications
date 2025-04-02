-- 🔧 Mise à jour des anciennes valeurs de type vers les nouvelles pour éviter les erreurs pendant la migration
UPDATE "actors" SET "type" = 'MOA' WHERE "type" = 'Responsable';
UPDATE "actors" SET "type" = 'MOE' WHERE "type" = 'ResponsableAutre';
UPDATE "actors" SET "type" = 'RSSI' WHERE "type" = 'RepresentantSSI';
UPDATE "actors" SET "type" = 'ArchitecteTechnique' WHERE "type" = 'ArchitecteInfra';
-- Les autres valeurs sont conservées ou sont nouvelles (pas besoin de mise à jour)
BEGIN;
CREATE TYPE "ActorType_new" AS ENUM ('MOA', 'MOE', 'RSSI', 'ArchitecteApplicatif', 'ArchitecteTechnique', 'TMA', 'Exploitation', 'RSIMM', 'CPD', 'OrganismeBeneficiaire', 'ProductOwner', 'ProductManager', 'Hebergement', 'Autre');
ALTER TABLE "actors" ALTER COLUMN "type" TYPE "ActorType_new" USING ("type"::text::"ActorType_new");
ALTER TYPE "ActorType" RENAME TO "ActorType_old";
ALTER TYPE "ActorType_new" RENAME TO "ActorType";
DROP TYPE "ActorType_old";
COMMIT;