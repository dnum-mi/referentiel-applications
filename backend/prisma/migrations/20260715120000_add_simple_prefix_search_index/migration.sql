-- Recrée la vue matérialisée de recherche pour ajouter un document `document_simple`
-- (dictionnaire `simple`, sans lemmatisation) dédié à l'autocomplétion par préfixe.
--
-- Problème corrigé (recherche globale du header) :
--   `to_tsquery('french', 'mot:*')` lemmatise le terme saisi. La frappe partielle
--   d'un mot (autocomplétion) produit alors un lexème qui ne préfixe PAS le lexème
--   indexé lemmatisé — ex. « applic » ne matche pas « appliqu » (stem de
--   « application »), « informat » ne matche pas « inform ». Résultat : l'application
--   disparaît en cours de frappe puis réapparaît au mot complet.
--
-- Un document `simple` (non lemmatisé) rend le préfixe littéral : « applic:* » matche
-- « application » à chaque étape de la frappe. Le document `french` pondéré est
-- conservé pour la recherche par pertinence (paramètre `q`), où la lemmatisation
-- reste souhaitable.

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
  setweight(to_tsvector('french', immutable_unaccent(coalesce(actors.value, ''))), 'C') AS document,
  -- Document non lemmatisé (simple) — autocomplétion par préfixe (`qPrefix`).
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(actors.value, ''))), 'C') AS document_simple
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

-- Index.
--   - Unique sur applicationId : requis par REFRESH MATERIALIZED VIEW CONCURRENTLY.
--   - GIN sur chaque document : recherche full-text performante.
CREATE UNIQUE INDEX application_search_index_application_id_key
  ON application_search_index ("applicationId");
CREATE INDEX application_search_index_document_idx
  ON application_search_index USING gin (document);
CREATE INDEX application_search_index_document_simple_idx
  ON application_search_index USING gin (document_simple);
