-- Refonte de la « Stack technique » par technologie (#2026) : ajout du produit concret
-- et d'un lien documentaire ; l'unicité passe de (application, technologie) à
-- (application, technologie, produit).

-- Produit : ajouté nullable, rétro-rempli depuis la technologie existante, puis NOT NULL.
ALTER TABLE "TechnologyStack" ADD COLUMN "product" TEXT;
UPDATE "TechnologyStack" SET "product" = "technology" WHERE "product" IS NULL;
ALTER TABLE "TechnologyStack" ALTER COLUMN "product" SET NOT NULL;

-- Lien documentaire (optionnel).
ALTER TABLE "TechnologyStack" ADD COLUMN "docUrl" VARCHAR(2048);

-- Unicité : (applicationId, technology) -> (applicationId, technology, product).
DROP INDEX "TechnologyStack_applicationId_technology_key";
CREATE UNIQUE INDEX "TechnologyStack_applicationId_technology_product_key" ON "TechnologyStack"("applicationId", "technology", "product");
