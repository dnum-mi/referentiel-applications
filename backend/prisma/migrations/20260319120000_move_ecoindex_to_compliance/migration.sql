-- Add EcoIndex fields to Compliance table
ALTER TABLE "Compliance" ADD COLUMN IF NOT EXISTS "eco_index_score" DOUBLE PRECISION;
ALTER TABLE "Compliance" ADD COLUMN IF NOT EXISTS "eco_index_ges" DOUBLE PRECISION;
ALTER TABLE "Compliance" ADD COLUMN IF NOT EXISTS "eco_index_water" DOUBLE PRECISION;
ALTER TABLE "Compliance" ADD COLUMN IF NOT EXISTS "eco_index_target_url" TEXT;
ALTER TABLE "Compliance" ADD COLUMN IF NOT EXISTS "eco_index_last_calculated_at" TIMESTAMP(3);

-- Drop old ecoEnergy table (data migrated into Compliance)
DROP TABLE IF EXISTS "ecoEnergy";
