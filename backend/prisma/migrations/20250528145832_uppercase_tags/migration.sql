-- Convertit chaque élément du tableau tags en majuscule
UPDATE "applications"
SET tags = (
  SELECT ARRAY_AGG(upper(tag))
  FROM UNNEST(tags) AS tag
);
