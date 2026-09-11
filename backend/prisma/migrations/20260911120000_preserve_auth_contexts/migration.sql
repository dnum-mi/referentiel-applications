-- Preserve distinct methods/providers/sources during the observation phase, even when
-- they currently resolve to the same level. Existing rows retain an unknown source.
ALTER TABLE "UserConnexionLog"
ADD COLUMN "authSource" TEXT,
ADD COLUMN "authContextKey" TEXT NOT NULL DEFAULT '';

-- array_to_json produces the same compact string-array encoding as JSON.stringify.
-- PostgreSQL's built-in sha256(bytea) requires no extension.
UPDATE "UserConnexionLog"
SET "authContextKey" = encode(sha256(convert_to(
  array_to_json(ARRAY["authMethod", "authIdp", "authSource"])::text, 'UTF8'
)), 'hex');

CREATE UNIQUE INDEX "UserConnexionLog_userId_authTime_authLevel_authContextKey_key"
ON "UserConnexionLog"("userId", "authTime", "authLevel", "authContextKey");

DROP INDEX "UserConnexionLog_userId_authTime_authLevel_key";
