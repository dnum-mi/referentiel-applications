-- Renomme la colonne pour la cohérence base de données / IHM (cf. ticket #1900).
-- RENAME COLUMN préserve les données existantes.
ALTER TABLE "TechnicalDebtInfo" RENAME COLUMN "costMaturity" TO "costContainment";
