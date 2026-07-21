-- Le flag « fulltext-search » gouverne désormais la barre de recherche rapide du
-- header — une fonctionnalité DÉJÀ en production (ticket 1753). Son état initial
-- (désactivé, posé par 20260720130000_seed_feature_flags avant le câblage) est
-- rattrapé à « activé » pour ne pas couper la recherche au déploiement.
-- On ne touche pas à un flag déjà basculé par un admin (updatedById non nul).
UPDATE "FeatureFlag"
SET "enabled" = true
WHERE "key" = 'fulltext-search'
  AND "updatedById" IS NULL;
