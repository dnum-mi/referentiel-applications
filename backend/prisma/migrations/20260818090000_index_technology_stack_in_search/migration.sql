-- Indexe la stack technique (TechnologyStack) dans la recherche des fiches.
--
-- Problèmes corrigés (recherche globale du header) :
--   1. La stack technique n'était pas indexée : chercher « PostgreSQL » ne
--      remontait pas les fiches dont la stack contient ce produit.
--   2. Les versions ne matchaient pas par préfixe de segments : « 15 » doit
--      matcher « 15.5 » et « 15 », mais PAS « 150 » ni « 1.5 ».
--
-- Choix d'implémentation :
--   - Le produit (ex. « PostgreSQL ») et la version sont ajoutés aux deux
--     documents (french et simple) en poids C, comme les autres champs annexes
--     (tags, labels, acteurs). L'insensibilité à la casse est native au FTS
--     (to_tsvector minusculise les lexèmes, la tsquery aussi).
--   - La correspondance de version par préfixe de segments est faite À
--     L'INDEXATION : chaque version est développée en la liste de ses préfixes
--     de segments (« 15.5.2 » → « 15 15.5 15.5.2 »). La requête « 15 » (lexème
--     exact produit par plainto_tsquery) matche alors toutes les 15.x, sans
--     matcher « 150 » (lexème '150') ni « 1.5 » (lexèmes '1' et '1.5'). Une
--     expansion côté requête (« 15:* ») matcherait à tort « 150 ».
--   - Les produits contenant un point (« Node.js ») sont indexés une seconde
--     fois avec le point remplacé par une espace : le parseur FTS traite
--     « node.js » comme un unique lexème (type host) que la recherche « node »
--     ne matcherait pas.

-- Développe une version en ses préfixes de segments, séparés par des espaces :
-- « 15.5.2 » → « 15 15.5 15.5.2 ». STRICT : NULL → NULL (coalesce à l'appel).
-- IMMUTABLE : pur calcul sur chaînes (requis si un jour indexée directement).
CREATE OR REPLACE FUNCTION version_segment_prefixes(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$
  SELECT string_agg(array_to_string(s.segments[1:n], '.'), ' ' ORDER BY n)
  FROM (SELECT string_to_array(btrim($1), '.') AS segments) s,
       generate_series(1, array_length(s.segments, 1)) AS n
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
  setweight(to_tsvector('french', immutable_unaccent(coalesce(technologies.value, ''))), 'C') AS document,
  -- Document non lemmatisé (simple) — autocomplétion par préfixe (`qPrefix`).
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(actors.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(technologies.value, ''))), 'C') AS document_simple
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
  SELECT string_agg(
           concat_ws(' ',
             ts.product,
             -- Variante « Node js » si le produit contient un point (NULL sinon).
             NULLIF(replace(ts.product, '.', ' '), ts.product),
             version_segment_prefixes(ts.version)
           ), ' ') AS value
  FROM "TechnologyStack" ts
  WHERE ts."applicationId" = a.id
) technologies ON true;

-- Index.
--   - Unique sur applicationId : requis par REFRESH MATERIALIZED VIEW CONCURRENTLY.
--   - GIN sur chaque document : recherche full-text performante.
CREATE UNIQUE INDEX application_search_index_application_id_key
  ON application_search_index ("applicationId");
CREATE INDEX application_search_index_document_idx
  ON application_search_index USING gin (document);
CREATE INDEX application_search_index_document_simple_idx
  ON application_search_index USING gin (document_simple);
