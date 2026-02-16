/*
  Warnings:

  - You are about to alter the column `email` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `firstname` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `lastname` on the `Actor` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `code` on the `ActorType` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `label` on the `ActorType` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `shortName` on the `Application` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `dima_recovery_manager` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `dsfr_version` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `pdma_backup_frequency` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `pdma_backup_method` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `pdma_restoration_manager` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `rgpd_dpo_name` on the `Compliance` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `label` on the `Hosting` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `room` on the `HostingOption` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `building` on the `HostingOption` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `site` on the `HostingOption` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `platform` on the `HostingOption` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `provider` on the `HostingOption` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `source` on the `Label` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `value` on the `Label` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `path` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `sigle` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `name` on the `Tag` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `name` on the `Token` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `hash` on the `Token` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(512)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "Actor" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "firstname" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "lastname" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "ActorType" ALTER COLUMN "code" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "label" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "shortName" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Compliance" ALTER COLUMN "dima_recovery_manager" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "dsfr_version" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "pdma_backup_frequency" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "pdma_backup_method" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "pdma_restoration_manager" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "rgpd_dpo_name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Hosting" ALTER COLUMN "label" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "HostingOption" ALTER COLUMN "room" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "building" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "site" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "provider" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Label" ALTER COLUMN "source" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "value" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "path" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "sigle" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Token" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "hash" SET DATA TYPE VARCHAR(512);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255);
