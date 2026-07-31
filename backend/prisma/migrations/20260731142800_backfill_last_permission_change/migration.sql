-- Backfill lastPermissionChangeAt / lastPermissionChangedById for users that already had
-- entries in UserPermissionLog before these columns existed, from the most recent log row.
UPDATE "User" AS u
SET "lastPermissionChangeAt" = latest."createdAt",
    "lastPermissionChangedById" = latest."changedById"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "createdAt", "changedById"
  FROM "UserPermissionLog"
  ORDER BY "userId", "createdAt" DESC
) AS latest
WHERE u.id = latest."userId";
