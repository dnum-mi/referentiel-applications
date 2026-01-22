/*
  Warnings:

  - You are about to alter the column `technicalMaturity` on the `TechnicalDebtInfo` table. The data in that column could be lost. The data in that column will be cast from `SmallInt` to `Decimal(3,2)`.
  - You are about to alter the column `businessMaturity` on the `TechnicalDebtInfo` table. The data in that column could be lost. The data in that column will be cast from `SmallInt` to `Decimal(3,2)`.
  - You are about to alter the column `costMaturity` on the `TechnicalDebtInfo` table. The data in that column could be lost. The data in that column will be cast from `SmallInt` to `Decimal(3,2)`.

*/
-- AlterTable
ALTER TABLE "TechnicalDebtInfo" ALTER COLUMN "technicalMaturity" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "businessMaturity" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "costMaturity" SET DATA TYPE DECIMAL(3,2);

UPDATE "TechnicalDebtInfo"
SET "technicalMaturity" = COALESCE("technicalMaturity", 0),
    "businessMaturity" = COALESCE("businessMaturity", 0),
    "costMaturity" = COALESCE("costMaturity", 0);

ALTER TABLE "TechnicalDebtInfo"
  ALTER COLUMN "technicalMaturity" SET DEFAULT 0,
  ALTER COLUMN "technicalMaturity" SET NOT NULL,
  ALTER COLUMN "businessMaturity" SET DEFAULT 0,
  ALTER COLUMN "businessMaturity" SET NOT NULL,
  ALTER COLUMN "costMaturity" SET DEFAULT 0,
  ALTER COLUMN "costMaturity" SET NOT NULL;
