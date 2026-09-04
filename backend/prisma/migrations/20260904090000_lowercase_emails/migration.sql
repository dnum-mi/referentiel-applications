-- #2501 : rapprochement acteur ↔ utilisateur insensible à la casse des e-mails.
-- Les nouvelles écritures passent en minuscules ; rattrapage de l'existant.

-- Utilisateurs : "email" est unique. Si deux comptes ne diffèrent que par la casse (jamais vu en
-- base réelle, mais possible), on ne touche à aucun des deux : la comparaison insensible à la
-- casse côté application les couvre, et un rapprochement de comptes est une opération manuelle.
UPDATE "User" u
SET "email" = lower(u."email")
WHERE u."email" <> lower(u."email")
  AND NOT EXISTS (
    SELECT 1 FROM "User" o
    WHERE o."id" <> u."id" AND lower(o."email") = lower(u."email")
  );

-- Acteurs : pas d'unicité sur l'e-mail, rattrapage intégral.
UPDATE "Actor"
SET "email" = lower("email")
WHERE "email" IS NOT NULL AND "email" <> lower("email");
