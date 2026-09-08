-- AlterEnum
-- #2446 : sépare l'administration transverse (tags, sources, tokens, batchs, matrice…) de
-- l'administration des utilisateurs et des acteurs, seule exerçable dans un périmètre.
ALTER TYPE "Permission" ADD VALUE 'GlobalAdminManage';
