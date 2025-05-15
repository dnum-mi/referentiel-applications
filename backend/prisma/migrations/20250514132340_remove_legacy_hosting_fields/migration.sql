/*
  Warnings:

  - You are about to drop the column `nature` on the `Hosting` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `Hosting` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Hosting` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Hosting` table. All the data in the column will be lost.
  - You are about to drop the column `site` on the `Hosting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Hosting" DROP COLUMN "nature",
DROP COLUMN "platform",
DROP COLUMN "provider",
DROP COLUMN "region",
DROP COLUMN "site";
