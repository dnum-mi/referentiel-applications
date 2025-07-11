/*
  Warnings:

  - The values [regulation,standard,policy,contractual,security,privacy] on the enum `ComplianceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `name` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `scoreUnit` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `scoreValue` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `validityEnd` on the `compliances` table. All the data in the column will be lost.
  - You are about to drop the column `validityStart` on the `compliances` table. All the data in the column will be lost.

*/

-- Drop the view that depends on the compliances.name column
DROP VIEW IF EXISTS "export_full_detailed";

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('OK', 'KO');

-- CreateEnum
CREATE TYPE "BackupStorage" AS ENUM ('S3', 'LOCAL', 'EXTERNE');

-- AlterTable
ALTER TABLE "compliances" DROP COLUMN "name",
DROP COLUMN "notes",
DROP COLUMN "scoreUnit",
DROP COLUMN "scoreValue",
DROP COLUMN "status",
DROP COLUMN "validityEnd",
DROP COLUMN "validityStart",
DROP COLUMN "type",
ADD COLUMN     "dima_business_impact" TEXT,
ADD COLUMN     "dima_duration_hours" INTEGER,
ADD COLUMN     "dima_is_hno" BOOLEAN,
ADD COLUMN     "dima_last_test_date" TIMESTAMP(3),
ADD COLUMN     "dima_recovery_manager" TEXT,
ADD COLUMN     "dima_recovery_plan" BOOLEAN,
ADD COLUMN     "dima_recovery_solutions" TEXT,
ADD COLUMN     "dima_test_result" "TestResult",
ADD COLUMN     "dsfr_implemented" BOOLEAN,
ADD COLUMN     "dsfr_version" TEXT,
ADD COLUMN     "homologation_date" TIMESTAMP(3),
ADD COLUMN     "homologation_duration_months" INTEGER,
ADD COLUMN     "homologation_rssi_id" TEXT,
ADD COLUMN     "pdma_backup_frequency" TEXT,
ADD COLUMN     "pdma_backup_method" TEXT,
ADD COLUMN     "pdma_backup_storage" "BackupStorage",
ADD COLUMN     "pdma_data_types" TEXT,
ADD COLUMN     "pdma_duration_hours" INTEGER,
ADD COLUMN     "pdma_last_test_date" TIMESTAMP(3),
ADD COLUMN     "pdma_restoration_manager" TEXT,
ADD COLUMN     "pdma_test_result" "TestResult",
ADD COLUMN     "rgaa_accessibility_url" TEXT,
ADD COLUMN     "rgaa_audit_date" TIMESTAMP(3),
ADD COLUMN     "rgaa_score_percentage" INTEGER,
ADD COLUMN     "rgaa_service_url" TEXT,
ADD COLUMN     "rgpd_dpo_name" TEXT,
ADD COLUMN     "rgpd_has_aipd" BOOLEAN;

-- Drop old enum types
DROP TYPE "ComplianceStatus";
DROP TYPE "ComplianceType";

-- AddForeignKey
ALTER TABLE "compliances" ADD CONSTRAINT "compliances_homologation_rssi_id_fkey" FOREIGN KEY ("homologation_rssi_id") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate the view with updated compliance logic
CREATE OR REPLACE VIEW "export_full_detailed" AS
SELECT  
    p.id,
    p.label AS "application",
    p."shortName" AS "short",
    p.description,
    p."priorityRestart",
    
    -- Informations d'hébergement
    COALESCE(STRING_AGG(
        DISTINCT ho.provider || '-' || ho.site || '-' || 
        COALESCE(ho.building || '-', '') || 
        COALESCE(ho.room || '-', '') || 
        ho.platform, 
        E'\n'
    ), '') AS "hebergements",

    p.tags AS "tags",

    -- Acteurs de type Maîtrise d'Ouvrage
    COALESCE(STRING_AGG(
        DISTINCT t.label || ' - ' || COALESCE(o.label,' ') || ' (' || COALESCE(a.email,'no mail') || ')', 
        E'\n'
    ) FILTER (WHERE t.label = 'Maîtrise d''Ouvrage'), '') AS "MOA",

    -- Acteurs de type Maîtrise d'Œuvre
    COALESCE(STRING_AGG(
        DISTINCT t.label || ' - ' || COALESCE(o.label,' ') || ' (' || COALESCE(a.email,'no mail') || ')', 
        E'\n'
    ) FILTER (WHERE t.label = 'Maîtrise d''Œuvre'), '') AS "MOE",

    -- Acteurs de type Responsable de l'hébergement
    COALESCE(STRING_AGG(
        DISTINCT t.label || ' - ' || COALESCE(o.label,' ') || ' (' || COALESCE(a.email,'no mail') || ')', 
        E'\n'
    ) FILTER (WHERE t.label = 'Responsable de l''hébergement'), '') AS "Hebergeur",

    -- Responsable des SI Métier et de la Modernisation
    COALESCE(STRING_AGG(
        DISTINCT t.label || ' - ' || COALESCE(o.label,' ') || ' (' || COALESCE(a.email,'no mail') || ')', 
        E'\n'
    ) FILTER (WHERE t.label = 'Responsable des SI Métier et de la Modernisation'), '') AS "RSSIM",

    -- Tous les autres acteurs
    COALESCE(STRING_AGG(
        DISTINCT t.label || ' - ' || COALESCE(o.label,' ') || ' (' || COALESCE(a.email,'no mail') || ')', 
        E'\n'
    ) FILTER (
        WHERE t.label IS DISTINCT FROM 'Maîtrise d''Ouvrage' 
          AND t.label IS DISTINCT FROM 'Maîtrise d''Œuvre'
          AND t.label IS DISTINCT FROM 'Responsable de l''hébergement'
          AND t.label IS DISTINCT FROM 'Responsable des SI Métier et de la Modernisation'
    ), '') AS "Autres Acteurs",

    -- Conformités PDMA
    CASE 
        WHEN c.pdma_duration_hours IS NOT NULL THEN 
            'PDMA' || COALESCE(' ' || c.pdma_duration_hours || 'H', '')
        ELSE ''
    END AS "Conformité PDMA",

    -- Conformités DIMA
    CASE 
        WHEN c.dima_duration_hours IS NOT NULL THEN 
            'DIMA' || COALESCE(' ' || c.dima_duration_hours || 'H', '')
        ELSE ''
    END AS "Conformité DIMA",

    -- Conformités PRA (mapped from DIMA and PDMA recovery plans)
    CASE 
        WHEN c.dima_recovery_plan = true THEN 'PRA DIMA'
        WHEN c.pdma_restoration_manager IS NOT NULL THEN 'PRA PDMA'
        ELSE ''
    END AS "Conformité PRA",    

    -- Conformités RGAA
    CASE 
        WHEN c.rgaa_score_percentage = 100 THEN 'RGAA Conformité totale'
        WHEN c.rgaa_score_percentage >= 50 THEN 'RGAA Conformité partielle'
        WHEN c.rgaa_score_percentage IS NOT NULL THEN 'RGAA Non-conformité'
        ELSE ''
    END AS "Conformité RGAA",  
	
    -- Conformités DSFR
    CASE 
        WHEN c.dsfr_implemented = true THEN 'DSFR (Implémenté)'
        WHEN c.dsfr_implemented = false THEN 'DSFR (Non implémenté)'
        ELSE ''
    END AS "Conformité DSFR",  

    -- Conformités AIPD (mapped from RGPD)
    CASE 
        WHEN c.rgpd_has_aipd = true THEN 'AIPD réalisée'
        WHEN c.rgpd_has_aipd = false THEN 'AIPD non réalisée'
        ELSE ''
    END AS "Conformité AIPD",  

	-- Homologation
    CASE 
        WHEN c.homologation_date IS NOT NULL THEN 'Homologation'
        ELSE ''
    END AS "Autres Conformités",

    -- Liens vers des ressources externes
    COALESCE(STRING_AGG(DISTINCT u.link, E'\n'), '') AS "liens"

FROM public.applications AS p
LEFT JOIN public."Hosting" AS h ON p.id = h."applicationId"
LEFT JOIN public.actors AS a ON p.id = a."applicationId"
LEFT JOIN public."Organization" AS o ON o.id = a."organizationId"
LEFT JOIN public."actorTypes" AS t ON t.id = a."actorTypeId"
LEFT JOIN public.compliances AS c ON p.id = c."applicationId"
LEFT JOIN public."ExternalRessource" AS u ON p.id = u."applicationId" 
LEFT JOIN public."HostingOption" AS ho ON ho.id = h."hostingOptionId"
GROUP BY 
    p.id, p.label, p."shortName", p.description, 
    p."priorityRestart", p.tags,
    c.pdma_duration_hours, c.dima_duration_hours, c.dima_recovery_plan, c.pdma_restoration_manager, 
    c.rgaa_score_percentage, c.dsfr_implemented, c.rgpd_has_aipd, c.homologation_date
ORDER BY p.label;
