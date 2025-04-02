/*
  Warnings:

  - The values [Responsable,ResponsableAutre,RepresentantSSI,ArchitecteInfra] on the enum `ActorType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActorType_new" AS ENUM ('MOA', 'MOE', 'RSSI', 'ArchitecteApplicatif', 'ArchitecteTechnique', 'TMA', 'Exploitation', 'RSIMM', 'CPD', 'OrganismeBeneficiaire', 'ProductOwner', 'ProductManager', 'Hebergement', 'Autre');
ALTER TABLE "actors" ALTER COLUMN "type" TYPE "ActorType_new" USING ("type"::text::"ActorType_new");
ALTER TYPE "ActorType" RENAME TO "ActorType_old";
ALTER TYPE "ActorType_new" RENAME TO "ActorType";
DROP TYPE "ActorType_old";
COMMIT;
