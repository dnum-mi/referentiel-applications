/*
  Warnings:

  - You are about to drop the column `writeMetadata` on the `AppPermissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppPermissions" DROP COLUMN "writeMetadata",
ADD COLUMN     "manageAnomalyNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postAnomalyNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "readAnomalyNotifications" BOOLEAN NOT NULL DEFAULT false;
