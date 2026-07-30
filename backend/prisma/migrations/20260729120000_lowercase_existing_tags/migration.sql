-- #2119 : les tags doivent toujours être stockés en minuscules.
-- La contrainte de casse est désormais appliquée côté backend (CreateTagDto),
-- cette migration normalise les données existantes en base.

-- 1. Repérer, pour chaque nom normalisé (trim + minuscules), le tag canonique
--    à conserver (le plus ancien, à égalité le plus petit id).
CREATE TEMP TABLE "_tag_canonical" AS
SELECT DISTINCT ON (lower(btrim(name)))
  id AS canonical_id,
  lower(btrim(name)) AS normalized_name
FROM "Tag"
ORDER BY lower(btrim(name)), "createdAt" ASC, id ASC;

CREATE TEMP TABLE "_tag_duplicate" AS
SELECT t.id AS duplicate_id, c.canonical_id
FROM "Tag" t
JOIN "_tag_canonical" c ON c.normalized_name = lower(btrim(t.name))
WHERE t.id <> c.canonical_id;

-- 2. Réattribuer les associations Application <-> Tag des doublons vers le tag canonique.
INSERT INTO "_ApplicationToTag" ("A", "B")
SELECT j."A", d.canonical_id
FROM "_ApplicationToTag" j
JOIN "_tag_duplicate" d ON d.duplicate_id = j."B"
ON CONFLICT DO NOTHING;

DELETE FROM "_ApplicationToTag" j
USING "_tag_duplicate" d
WHERE j."B" = d.duplicate_id;

-- 3. Réattribuer les associations DataDescription <-> Tag des doublons vers le tag canonique.
INSERT INTO "_DataDescriptionToTag" ("A", "B")
SELECT j."A", d.canonical_id
FROM "_DataDescriptionToTag" j
JOIN "_tag_duplicate" d ON d.duplicate_id = j."B"
ON CONFLICT DO NOTHING;

DELETE FROM "_DataDescriptionToTag" j
USING "_tag_duplicate" d
WHERE j."B" = d.duplicate_id;

-- 4. Supprimer les tags doublons désormais orphelins.
DELETE FROM "Tag" t
USING "_tag_duplicate" d
WHERE t.id = d.duplicate_id;

-- 5. Normaliser en minuscules les tags restants.
UPDATE "Tag"
SET name = lower(btrim(name))
WHERE name <> lower(btrim(name));

DROP TABLE "_tag_duplicate";
DROP TABLE "_tag_canonical";
