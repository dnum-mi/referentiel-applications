-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationType_new" AS ENUM ('business', 'core_service', 'intranet_citizen', 'intranet_staff', 'data_hub');

ALTER TABLE "Application"
ALTER COLUMN "type"
TYPE "ApplicationType_new"
USING (
  CASE
    WHEN "type"::text = 'sso' THEN 'core_service'
    WHEN "type"::text = 'intranet_communication_website' THEN 'intranet_staff'
    WHEN "type"::text = 'website_communication' THEN 'intranet_citizen'
    ELSE "type"::text
  END
)::"ApplicationType_new";

ALTER TYPE "ApplicationType" RENAME TO "ApplicationType_old";
ALTER TYPE "ApplicationType_new" RENAME TO "ApplicationType";
DROP TYPE "ApplicationType_old";
COMMIT;
