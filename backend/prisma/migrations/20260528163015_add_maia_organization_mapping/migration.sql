-- CreateTable OrganizationMaiaReference
-- Override-only table for MAIA organization consolidation.
-- Allows admin to manually redirect MAIA paths to local organizations.
CREATE TABLE "OrganizationMaiaReference" (
    "id" TEXT NOT NULL,
    "maiaRef" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMaiaReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMaiaReference_maiaRef_key" ON "OrganizationMaiaReference"("maiaRef");

-- AddForeignKey
ALTER TABLE "OrganizationMaiaReference" ADD CONSTRAINT "OrganizationMaiaReference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
