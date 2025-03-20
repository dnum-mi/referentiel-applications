/*
  Warnings:

  - The primary key for the `relations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[applicationSource,applicationTarget,type]` on the table `relations` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `relations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "relations" DROP CONSTRAINT "relations_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "relations_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "relations_applicationSource_applicationTarget_type_key" ON "relations"("applicationSource", "applicationTarget", "type");
