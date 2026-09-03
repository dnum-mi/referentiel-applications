-- #2454 : origine de la date de fin de vie d'une ligne de stack. Les lignes existantes sont
-- toutes issues d'endoflife.date ; seule une saisie manuelle explicite passera à 'manual'.
-- CreateEnum
CREATE TYPE "TechnologyEolSource" AS ENUM ('endoflife', 'manual');

-- AlterTable
ALTER TABLE "TechnologyStack" ADD COLUMN "eolSource" "TechnologyEolSource" NOT NULL DEFAULT 'endoflife';
