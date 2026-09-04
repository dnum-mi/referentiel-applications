-- #2510 : un seul type d'acteur système (isDefault = true). Jusqu'ici garanti par le seed
-- seulement ; un second type par défaut rendrait les droits des non-acteurs dépendants de
-- l'ordre de lecture (findFirst). Index unique PARTIEL : Prisma ne sait pas l'exprimer dans
-- le schéma, il est documenté sur le modèle ActorType et doit être conservé lors d'un
-- `migrate diff`.
CREATE UNIQUE INDEX "ActorType_single_default_idx" ON "ActorType" ("isDefault") WHERE "isDefault" = true;
