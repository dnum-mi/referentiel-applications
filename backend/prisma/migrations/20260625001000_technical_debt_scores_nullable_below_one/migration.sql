-- Les scores de maturité passent sur une échelle 1-5 ; `null` = non évalué (cf. ticket #1900).
-- Les colonnes deviennent nullables et perdent leur défaut 0.
ALTER TABLE "TechnicalDebtInfo"
  ALTER COLUMN "technicalMaturity" DROP DEFAULT,
  ALTER COLUMN "technicalMaturity" DROP NOT NULL,
  ALTER COLUMN "businessMaturity" DROP DEFAULT,
  ALTER COLUMN "businessMaturity" DROP NOT NULL,
  ALTER COLUMN "costContainment" DROP DEFAULT,
  ALTER COLUMN "costContainment" DROP NOT NULL;

-- Migration des valeurs existantes < 1 vers `null` (non évalué).
UPDATE "TechnicalDebtInfo" SET "technicalMaturity" = NULL WHERE "technicalMaturity" < 1;
UPDATE "TechnicalDebtInfo" SET "businessMaturity" = NULL WHERE "businessMaturity" < 1;
UPDATE "TechnicalDebtInfo" SET "costContainment" = NULL WHERE "costContainment" < 1;
