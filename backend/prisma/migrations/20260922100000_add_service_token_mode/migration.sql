-- Les tokens existants conservent le mode machine à machine.
CREATE TYPE "ServiceTokenMode" AS ENUM ('machine', 'delegated');

ALTER TABLE "Token" ADD COLUMN "serviceMode" "ServiceTokenMode" NOT NULL DEFAULT 'machine';

-- Un ancien backend ne doit pas retirer le préfixe lors d'une régénération.
-- La contrainte protège aussi les tokens délégués pendant un retour arrière.
ALTER TABLE "Token" ADD CONSTRAINT "Token_service_mode_hash_check"
CHECK (("serviceMode" = 'delegated') = ("hash" LIKE 'delegated:%'));
