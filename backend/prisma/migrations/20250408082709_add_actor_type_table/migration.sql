-- DropIndex
DROP INDEX "actors_applicationId_idx";

-- AlterTable
ALTER TABLE "actors" ADD COLUMN     "actorTypeId" TEXT;

-- CreateTable
CREATE TABLE "actorTypes" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "actorTypes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actorTypes_code_key" ON "actorTypes"("code");

-- CreateIndex
CREATE INDEX "actors_applicationId_actorTypeId_idx" ON "actors"("applicationId", "actorTypeId");

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_actorTypeId_fkey" FOREIGN KEY ("actorTypeId") REFERENCES "actorTypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insérer les anciennes valeurs de l'enum dans actorTypes
INSERT INTO "actorTypes" ("id", "code", "label", "description")
VALUES
  (gen_random_uuid(), 'MOA', 'Maîtrise d’Ouvrage', ''),
  (gen_random_uuid(), 'MOE', 'Maîtrise d’Œuvre', ''),
  (gen_random_uuid(), 'RSSI', 'Responsable de la Sécurité des Systèmes d’Information', ''),
  (gen_random_uuid(), 'AA', 'Architecte Applicatif', ''),
  (gen_random_uuid(), 'AT', 'Architecte Technique', ''),
  (gen_random_uuid(), 'TMA', 'Tierce Maintenance Applicative', ''),
  (gen_random_uuid(), 'REP', 'Responsable d''exploitation opérationel', ''),
  (gen_random_uuid(), 'RTO', 'Responsable de traitement opérationnel', ''),
  (gen_random_uuid(), 'RSIMM', 'Responsable des SI Métier et de la Modernisation', ''),
  (gen_random_uuid(), 'CPD', 'Correspondant à la Protection des Données', ''),
  (gen_random_uuid(), 'CSM', 'Correspondant Stratégique Métier', 'Organisme Bénéficiaire'),
  (gen_random_uuid(), 'PO', 'Product Owner', ''),
  (gen_random_uuid(), 'PM', 'Product Manager', ''),
  (gen_random_uuid(), 'HEB', 'Responsable de l''hébergement', ''),
  (gen_random_uuid(), 'OTHER', 'Autre', 'Autre type d’acteur');

-- Migrer les acteurs existants vers leur actorType avec les bonnes correspondances
UPDATE "actors"
SET "actorTypeId" = (
  SELECT id FROM "actorTypes"
  WHERE code = CASE "actors"."type"
    WHEN 'MOA' THEN 'MOA'
    WHEN 'MOE' THEN 'MOE'
    WHEN 'RSSI' THEN 'RSSI'
    WHEN 'ArchitecteApplicatif' THEN 'AA'
    WHEN 'ArchitecteTechnique' THEN 'AT'
    WHEN 'TMA' THEN 'TMA'
    WHEN 'Exploitation' THEN 'REP'
    WHEN 'RSIMM' THEN 'RSIMM'
    WHEN 'CPD' THEN 'CPD'
    WHEN 'OrganismeBeneficiaire' THEN 'CSM'
    WHEN 'ProductOwner' THEN 'PO'
    WHEN 'ProductManager' THEN 'PM'
    WHEN 'Hebergement' THEN 'HEB'
    WHEN 'Autre' THEN 'OTHER'
    ELSE NULL
  END
)
WHERE "type" IS NOT NULL;

-- DropTable
ALTER TABLE "actors" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ActorType";
