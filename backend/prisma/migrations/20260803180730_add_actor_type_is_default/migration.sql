-- AlterTable
ALTER TABLE "ActorType" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Type d'acteur système représentant les droits par défaut d'un utilisateur non-acteur
-- (fallback dans CheckPermissions.getUserAppPermissions quand aucun Actor ne correspond).
-- Créé SANS AUCUN DROIT : contrairement à un type d'acteur normal (cf. actorType.service.ts
-- DEFAULT_APP_PERMISSIONS), on écrase ici explicitement aussi DataRead/DataWrite/TechnologyRead/
-- ReportPost — dont le défaut Prisma est `true` — pour ne pas accorder ces droits par défaut à
-- TOUT utilisateur non-acteur de l'application.
WITH inserted_actor_type AS (
  INSERT INTO "ActorType" (id, code, label, description, "isDefault")
  VALUES (
    gen_random_uuid(),
    'NON_ACTOR',
    'Droits par défaut d''un utilisateur',
    'Type d''acteur système : droits par défaut d''un utilisateur qui n''est acteur d''aucune application. Non assignable à un acteur réel.',
    true
  )
  RETURNING id
)
INSERT INTO "AppPermissions" (
  "AppRead", "AppWrite", "AppWritePriority",
  "ActorRead", "ActorWrite",
  "ComplianceRead", "ComplianceWrite", "HostingRead", "HostingWrite",
  "MetadataRead", "RelationRead", "RelationWrite", "LinkRead", "LinkWrite",
  "DataRead", "DataWrite", "TechnologyRead", "TechnologyWrite",
  "ReportRead", "ReportPost", "ReportManage",
  "actorTypeId"
)
SELECT
  false, false, false,
  false, false,
  false, false, false, false,
  false, false, false, false, false,
  false, false, false, false,
  false, false, false,
  id
FROM inserted_actor_type;
