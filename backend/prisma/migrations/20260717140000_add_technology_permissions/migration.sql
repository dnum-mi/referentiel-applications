-- Permissions dédiées à la stack technique (#2027), calquées sur DataRead/DataWrite :
-- lecture ouverte à tous par défaut, écriture réservée.

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'TechnologyRead';
ALTER TYPE "Permission" ADD VALUE 'TechnologyWrite';

-- AlterTable : le DEFAULT true sur TechnologyRead couvre les lignes AppPermissions
-- existantes (lecture ouverte à tous les types d'acteur sans back-fill).
ALTER TABLE "AppPermissions" ADD COLUMN "TechnologyRead"  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppPermissions" ADD COLUMN "TechnologyWrite" BOOLEAN NOT NULL DEFAULT false;
