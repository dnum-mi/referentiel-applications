/*
  Warnings:

  - You are renaming label into path in the table Organization

*/
-- AlterTable
ALTER TABLE "Organization" RENAME COLUMN "label" TO "path";