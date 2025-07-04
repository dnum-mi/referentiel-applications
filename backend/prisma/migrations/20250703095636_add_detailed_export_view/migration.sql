-- CreateView: ApplicationsExport
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

    -- Conformités contenant "PDMA"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%PDMA%'
    ), '') AS "Conformité PDMA",

    -- Conformités contenant "DIMA"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%DIMA%'
    ), '') AS "Conformité DIMA",

    -- Conformités contenant "PRA"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%PRA%'
    ), '') AS "Conformité PRA",    

    -- Conformités contenant "RGAA"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%RGAA%'
    ), '') AS "Conformité RGAA",  
	
    -- Conformités contenant "DSFR"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%DSFR%'
    ), '') AS "Conformité DSFR",  

    -- Conformités contenant "AIPD"
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name ILIKE '%AIPD%'
    ), '') AS "Conformité AIPD",  

	-- Toutes les autres conformités
    COALESCE(STRING_AGG(DISTINCT c.name, E'\n') FILTER (
        WHERE c.name IS NOT NULL 
          AND c.name NOT ILIKE '%PDMA%' 
          AND c.name NOT ILIKE '%DIMA%'
          AND c.name NOT ILIKE '%RGAA%' 
          AND c.name NOT ILIKE '%DSFR%'
          AND c.name NOT ILIKE '%PRA%'		
          AND c.name NOT ILIKE '%AIPD%'		  
    ), '') AS "Autres Conformités",

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
    p."priorityRestart", p.tags
ORDER BY p.label;