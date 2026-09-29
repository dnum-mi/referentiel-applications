-- #2310 : inclut les produits et les versions de la stack technique dans
-- les recherches plein texte et les suggestions. Les poids A/B/C existants
-- restent inchangés ; D est réservé aux versions pour distinguer un préfixe
-- de nom (« Budget 20 » -> « Budget 2026 ») d'un segment de version (« 15 »
-- -> « 15.5 », mais pas « 150 »).
BEGIN;

DROP MATERIALIZED VIEW application_search_index;

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
  setweight(to_tsvector('french', immutable_unaccent(coalesce(actors.value, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(technologies.products, ''))), 'C') ||
  setweight(to_tsvector('french', immutable_unaccent(coalesce(technologies.versions, ''))), 'D') AS document,
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.label, ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a."shortName", ''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(a.description, ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a.purposes, ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(array_to_string(a."targetPopulations", ' '), ''))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(tags.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(labels.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(actors.value, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(technologies.products, ''))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(technologies.versions, ''))), 'D') AS document_simple
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
  SELECT
    -- Préserve le produit original pour q=Node.js et ajoute ses mots pour
    -- qPrefix=Node.js / Node j (le parseur PostgreSQL reconnaît un nom d'hôte).
    string_agg(concat_ws(' ', ts.product,
      regexp_replace(ts.product, '[^[:alnum:]]+', ' ', 'g')), ' ') AS products,
    string_agg(version_prefixes.value, ' ') AS versions
  FROM "TechnologyStack" ts
  LEFT JOIN LATERAL (
    -- « 15.5.2 » devient « 15 15.5 15.5.2 ». Le dernier préfixe conserve
    -- aussi les versions libres, par exemple « latest » ou « 15.5-alpine ».
    -- Une version absente ne doit pas faire disparaître son produit.
    SELECT string_agg(array_to_string(v.segments[1:s.i], '.'), ' ' ORDER BY s.i) AS value
    FROM (SELECT string_to_array(btrim(ts.version), '.') AS segments) v
    CROSS JOIN LATERAL generate_subscripts(v.segments, 1) AS s(i)
  ) version_prefixes ON true
  WHERE ts."applicationId" = a.id
) technologies ON true;

-- L'index unique permet de conserver les rafraîchissements CONCURRENTLY.
CREATE UNIQUE INDEX application_search_index_application_id_key
  ON application_search_index ("applicationId");
CREATE INDEX application_search_index_document_idx
  ON application_search_index USING gin (document);
CREATE INDEX application_search_index_document_simple_idx
  ON application_search_index USING gin (document_simple);

COMMIT;
