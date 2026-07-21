-- Retrait du flag « administrateur de l'application » (revert de #2031 / issue #2028) :
-- les droits par application redeviennent entièrement pilotés par la matrice
-- AppPermissions éditable. La migration d'ajout (20260716120000) étant déployée,
-- on supprime la colonne via une nouvelle migration plutôt qu'en la modifiant.
ALTER TABLE "ActorType" DROP COLUMN "isAdmin";
