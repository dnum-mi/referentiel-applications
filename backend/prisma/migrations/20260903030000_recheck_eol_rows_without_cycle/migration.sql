-- #2449 : la colonne "eolCycle" arrive vide sur toutes les lignes existantes. Une ligne
-- déjà résolue « produit suivi + version saisie + aucune fin de vie publiée » (Apache
-- HTTP Server 2.4, par exemple) serait alors indiscernable d'une version non reconnue,
-- et la fiche inviterait à corriger une saisie correcte — jusqu'à 7 jours, le TTL du
-- rafraîchissement paresseux, ou jusqu'au prochain passage du cron.
--
-- Remise à zéro ciblée de la date de vérification : ces seules lignes passent à
-- « Non vérifiée » (exact) et sont recalculées, cycle compris, dès la première
-- consultation de leur fiche ou au prochain recalcul planifié. Les lignes portant
-- une date de fin de vie gardent leur badge et ne sont pas concernées.
UPDATE "TechnologyStack"
SET "eolCheckedAt" = NULL
WHERE "eolProduct" IS NOT NULL
  AND "version" IS NOT NULL
  AND "eolDate" IS NULL
  AND "eolCycle" IS NULL;
