-- Index de performance pour la recherche d'applications (ticket #1753).
--
-- 1. Index B-tree sur les clés étrangères applicationId : Postgres n'indexe pas
--    automatiquement les FK. Chaque page de résultats charge hostings, labels et
--    ressources externes par applicationId, et les filtres `hostings.some` /
--    `labels.some` en dépendent aussi.
-- 2. Index GIN trigramme (pg_trgm, déjà installé par la migration full-text) :
--    accélèrent les filtres « contient » (ILIKE '%...%') des paramètres de
--    recherche `search`, `label` et `shortName`.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Application_label_trgm_idx" ON "Application" USING GIN ("label" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Application_shortName_trgm_idx" ON "Application" USING GIN ("shortName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ExternalRessource_applicationId_idx" ON "ExternalRessource"("applicationId");

-- CreateIndex
CREATE INDEX "Hosting_applicationId_idx" ON "Hosting"("applicationId");

-- CreateIndex
CREATE INDEX "Label_applicationId_idx" ON "Label"("applicationId");

-- CreateIndex
CREATE INDEX "Label_value_trgm_idx" ON "Label" USING GIN ("value" gin_trgm_ops);
