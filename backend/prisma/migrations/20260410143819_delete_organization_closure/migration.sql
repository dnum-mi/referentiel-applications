/*
  Warnings:

  - You are about to drop the `OrganizationClosure` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationClosure" DROP CONSTRAINT "OrganizationClosure_ancestorId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationClosure" DROP CONSTRAINT "OrganizationClosure_descendantId_fkey";

-- DropTable
DROP TABLE "OrganizationClosure";
