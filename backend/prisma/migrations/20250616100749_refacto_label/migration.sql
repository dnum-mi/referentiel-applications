/*
  Warnings:

  - You are about to drop the column `shortname` on the `labels` table. All the data in the column will be lost.
  - Made the column `value` on table `labels` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "labels" DROP COLUMN "shortname",
ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "value" SET NOT NULL;
