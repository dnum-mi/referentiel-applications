/*
  Warnings:

  - You are about to alter the column `rgaa_score_percentage` on the `compliances` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.

*/
-- Drop the view that depends on the compliances.rgaa_score_percentage column
DROP VIEW IF EXISTS "export_full_detailed";

-- AlterTable
ALTER TABLE "compliances" ALTER COLUMN "rgaa_score_percentage" SET DATA TYPE DECIMAL(5,2);

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
