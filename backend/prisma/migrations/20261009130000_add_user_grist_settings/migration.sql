-- Synchronisation Grist : instance, clé d'API et documents choisis par chaque utilisateur dans son profil.
ALTER TABLE "User" ADD COLUMN "gristDocIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "gristUrl" TEXT,
ADD COLUMN "gristApiKey" TEXT;
