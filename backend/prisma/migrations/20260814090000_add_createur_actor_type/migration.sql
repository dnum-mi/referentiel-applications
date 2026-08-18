-- Type d'acteur "Créateur" : assigné automatiquement à l'utilisateur qui crée une application
-- (cf. ApplicationService.createApplication), avec des droits complets sur l'application créée.
-- Suit le même schéma que la migration 20260803180730_add_actor_type_is_default (insertion de
-- l'ActorType puis de sa ligne AppPermissions associée dans la même requête).
WITH inserted_actor_type AS (
  INSERT INTO "ActorType" (id, code, label, description)
  VALUES (
    gen_random_uuid(),
    'CREATEUR',
    'Créateur',
    'Utilisateur ayant créé l''application. Assigné automatiquement à la création de l''application.'
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
  true, true, false,
  true, true,
  true, true, true, true,
  true, true, true, true, true,
  true, true, true, true,
  true, true, true,
  id
FROM inserted_actor_type;
