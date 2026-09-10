-- #1985 : niveau d'authentification (carte agent / 2FA) observé à chaque connexion.
-- Une ligne par utilisateur, par jour ET par niveau : la clé unique change en conséquence.

-- CreateEnum
CREATE TYPE "AuthLevel" AS ENUM ('strong', 'weak', 'unknown');

-- DropIndex
DROP INDEX "UserConnexionLog_userId_authTime_key";

-- AlterTable
ALTER TABLE "UserConnexionLog" ADD COLUMN     "authIdp" TEXT,
ADD COLUMN     "authLevel" "AuthLevel" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "authMethod" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserConnexionLog_userId_authTime_authLevel_key" ON "UserConnexionLog"("userId", "authTime", "authLevel");
