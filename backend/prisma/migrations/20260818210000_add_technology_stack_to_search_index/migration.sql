-- Recherche : indexer la stack technique dans l'index full-text (issue #2310).
--
-- Deux causes corrigées :
--   1. La table "TechnologyStack" (produit + version) n'était pas reprise dans
--      la vue matérialisée `application_search_index` : rechercher « PostgreSQL »
--      ou « nginx » ne remontait aucune fiche.
--   2. Même indexée, une version ne matcherait qu'à l'exact : le parseur
--      plein-texte fait de « 15.5 » un lexème unique, la requête « 15 » ne le
--      trouve donc pas. On indexe chaque version accompagnée des préfixes
--      cumulés de ses segments (« 15.5.2 » → « 15 15.5 15.5.2 ») : la requête
--      « 15 » matche les versions 15 et 15.5, mais ni « 150 » ni « 1.5 ».

-- Développe une version en la liste de ses préfixes de segments.
-- Ex. : '15.5.2' → '15 15.5 15.5.2' ; '15' → '15' ; NULL → NULL (STRICT).
-- IMMUTABLE (pur calcul sur l'argument) : utilisable dans la vue matérialisée.
CREATE OR REPLACE FUNCTION version_search_terms(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$
  SELECT string_agg(array_to_string(p.parts[1:n], '.'), ' ')
  FROM (SELECT string_to_array($1, '.') AS parts) AS p,
       generate_series(1, array_length(p.parts, 1)) AS n
$$;

DROP MATERIALIZED VIEW IF EXISTS application_search_index;

CREATE MATERIALIZED VIEW application_search_index AS
SELECT
  a.id AS "applicationId",
  -- Document lemmatisé (french) — recherche par pertinence (`q`).
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(actors.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(stack.value, ''))), 'C') AS document,
  -- Document non lemmatisé (simple) — autocomplétion par préfixe (`qPrefix`).
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(actors.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(stack.value, ''))), 'C') AS document_simple
FROM "Application" a
LEFT JOIN LATERAL (
  SELECT string_agg(t.name, ' ') AS value
  FROM "_ApplicationToTag" att
  JOIN "Tag" t ON t.id = att."B"
  WHERE att."A" = a.id
) tags ON true
LEFT JOIN LATERAL (
  SELECT string_agg(l.value, ' ') AS value
  FROM "Label" l
  WHERE l."applicationId" = a.id
) labels ON true
LEFT JOIN LATERAL (
  SELECT string_agg(concat_ws(' ', ac.firstname, ac.lastname), ' ') AS value
  FROM "Actor" ac
  WHERE ac."applicationId" = a.id
) actors ON true
LEFT JOIN LATERAL (
  -- Stack technique : produit + préfixes de segments de la version. La famille
  -- (ts.technology, ex. « Base de données ») est volontairement exclue : trop
  -- générique, elle polluerait la pertinence.
  SELECT string_agg(
           concat_ws(' ', ts.product, version_search_terms(ts.version)),
           ' ') AS value
  FROM "TechnologyStack" ts
  WHERE ts."applicationId" = a.id
) stack ON true;

-- Index.
--   - Unique sur applicationId : requis par REFRESH MATERIALIZED VIEW CONCURRENTLY.
--   - GIN sur chaque document : recherche full-text performante.
CREATE UNIQUE INDEX application_search_index_application_id_key
  ON application_search_index ("applicationId");
CREATE INDEX application_search_index_document_idx
  ON application_search_index USING gin (document);
CREATE INDEX application_search_index_document_simple_idx
  ON application_search_index USING gin (document_simple);
