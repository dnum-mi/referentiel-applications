-- CreateTable
CREATE TABLE "OrganizationClosure" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationClosure_ancestorId_descendantId_key" ON "OrganizationClosure"("ancestorId", "descendantId");

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_parentId_fkey";

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationClosure" ADD CONSTRAINT "OrganizationClosure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationClosure" ADD CONSTRAINT "OrganizationClosure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
