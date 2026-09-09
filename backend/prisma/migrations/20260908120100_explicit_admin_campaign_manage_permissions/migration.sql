-- #2608 : QualityCampaignManage et MditCampaignManage ne sont plus accordées implicitement à
-- tout utilisateur ADMIN via son rôle (retirées de ADMIN_PERMISSIONS côté code) : elles doivent
-- désormais être indiquées explicitement, comme pour un utilisateur délégué non-admin. On
-- préserve ici les droits des administrateurs existants en les reportant dans
-- additionalPermissions, sans dupliquer une valeur déjà présente.
UPDATE "User"
SET "additionalPermissions" = array_append("additionalPermissions", 'QualityCampaignManage'::"Permission")
WHERE "role" = 'ADMIN'
  AND NOT ('QualityCampaignManage'::"Permission" = ANY("additionalPermissions"));

UPDATE "User"
SET "additionalPermissions" = array_append("additionalPermissions", 'MditCampaignManage'::"Permission")
WHERE "role" = 'ADMIN'
  AND NOT ('MditCampaignManage'::"Permission" = ANY("additionalPermissions"));
