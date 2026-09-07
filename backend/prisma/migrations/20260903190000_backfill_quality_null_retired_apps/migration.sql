-- #2244 : le passage de "quality" à null pour les applications décommissionnées ou
-- supprimées (nullable_quality) n'avait été appliqué que pour les futurs recalculs.
-- Cette migration rattrape les applications déjà en base dont le statut courant
-- est "decommissioned" ou "deleted" mais dont "quality" n'a pas encore été remise à null.
UPDATE "Application"
SET "quality" = NULL
FROM "ApplicationStatus"
WHERE "Application"."currentStatusId" = "ApplicationStatus"."id"
  AND "ApplicationStatus"."status" IN ('decommissioned', 'deleted')
  AND "Application"."quality" IS NOT NULL;
