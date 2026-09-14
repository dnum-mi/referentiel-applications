-- #2593 : la migration 20260702160951_update_set_data_read_permission_by_true a changé le défaut
-- de "DataRead" à true, mais sans backfill — seules les lignes AppPermissions créées APRÈS cette
-- migration en ont bénéficié. Les types d'acteur créés avant (la quasi-totalité) sont restés
-- bloqués à "DataRead" = false, alors que la lecture des données est censée être acquise à tout
-- utilisateur authentifié (même principe que "AppRead"/"TechnologyRead", eux correctement à true
-- partout). Conséquence concrète : la matrice affichait "RW" pour Données sur ces lignes (l'écriture
-- est bien accordée) alors que la lecture était en réalité refusée.
UPDATE "AppPermissions"
SET "DataRead" = true
WHERE "DataRead" = false;
