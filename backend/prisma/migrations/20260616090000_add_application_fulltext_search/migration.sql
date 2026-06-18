-- Recherche full-text des applications (ticket #1753)
--
-- Cette migration est écrite à la main (Prisma ne modélise pas les vues
-- matérialisées ni les extensions/index GIN). Elle est idempotente afin de
-- pouvoir être rejouée sans risque (`prisma migrate deploy`).

-- 1. Extensions PostgreSQL.
--    - unaccent : recherche insensible aux accents (essentiel en français).
--    - pg_trgm  : similarité trigramme, disponible en complément (fallback / futur).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Wrapper IMMUTABLE autour de unaccent.
--    La forme 1-argument de unaccent() est seulement STABLE : elle ne peut donc
--    pas servir dans une expression indexée. La forme 2-arguments (dictionnaire
--    explicite) est IMMUTABLE ; on l'encapsule pour pouvoir indexer le tsvector.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
-- Tout est schéma-qualifié : lors de l'inlining à la création de la vue
-- matérialisée, le search_path est restreint et `unaccent` non qualifié
-- ne serait pas résolu ("function unaccent(regdictionary, text) does not exist").
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- 3. Vue matérialisée : un document tsvector pondéré par application.
--    Périmètre V0 (« champs descriptifs cœur ») :
--      Poids A : label, shortName
--      Poids B : description, finalités (purposes), populations cibles
--      Poids C : tags, labels alternatifs, noms des acteurs
--    Dictionnaire « french » => lemmatisation. immutable_unaccent => sans accents.
DROP MATERIALIZED VIEW IF EXISTS application_search_index;
CREATE MATERIALIZED VIEW application_search_index AS
SELECT
  a.id AS "applicationId",
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(actors.value, ''))), 'C') AS document
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
) actors ON true;

-- 4. Index.
--    - Unique sur applicationId : requis par REFRESH MATERIALIZED VIEW CONCURRENTLY.
--    - GIN sur le document : recherche full-text performante.
CREATE UNIQUE INDEX application_search_index_application_id_key
  ON application_search_index ("applicationId");
CREATE INDEX application_search_index_document_idx
  ON application_search_index USING gin (document);
