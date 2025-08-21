
UPDATE "applications" a
SET "tags" = (
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT lower(btrim(tag))
    FROM unnest(a."tags") AS tag
    WHERE tag IS NOT NULL AND btrim(tag) <> ''
    ORDER BY 1
  ), ARRAY[]::text[])
)
WHERE a."tags" IS NOT NULL;

INSERT INTO "tags" ("name")
SELECT DISTINCT unnest(a."tags")
FROM "applications" a
WHERE a."tags" IS NOT NULL
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "application_tag" ("applicationId","tagName")
SELECT a."id", tag
FROM "applications" a
CROSS JOIN LATERAL unnest(a."tags") AS tag
JOIN "tags" t ON t."name" = tag
ON CONFLICT DO NOTHING;