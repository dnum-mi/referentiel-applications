/*
  Warnings:

  - A unique constraint covering the columns `[userId,authTime]` on the table `UserConnexionLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authTime` to the `UserConnexionLog` table without a default value. This is not possible if the table is not empty.

*/
DELETE FROM "UserConnexionLog";
-- AlterTable
ALTER TABLE "UserConnexionLog" ADD COLUMN     "authTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserConnexionLog_userId_authTime_key" ON "UserConnexionLog"("userId", "authTime");
