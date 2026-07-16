-- Ajoute un indicateur « type d'acteur administrateur de l'application » sur ActorType.
-- Un acteur rattaché à un type `isAdmin` dispose toujours de l'ensemble des droits
-- applicatifs (lecture + écriture) sur SON application, indépendamment de la matrice
-- AppPermissions éditable (garantie appliquée dans check-permissions.service.ts).
ALTER TABLE "ActorType" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill : les types d'acteur responsables existants sont administrateurs de l'application
-- (aligné sur ACTOR_TYPE_CODES = MOA, MOE, ProductOwner, ProductManager).
UPDATE "ActorType"
SET "isAdmin" = true
WHERE "code" IN ('MOA', 'MOE', 'ProductOwner', 'ProductManager');
