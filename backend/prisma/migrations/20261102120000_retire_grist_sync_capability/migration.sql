-- Grist est désormais contrôlé par BetaFeatures ; ne pas élargir les droits existants.
UPDATE "User"
SET "additionalPermissions" = array_remove("additionalPermissions", 'GristSync'::"Permission")
WHERE 'GristSync'::"Permission" = ANY("additionalPermissions");
