-- #2527 : l'index unique (applicationId, technology, product) couvre déjà les recherches par
-- application ; l'index simple sur applicationId ne servait qu'à ralentir les écritures.
DROP INDEX IF EXISTS "TechnologyStack_applicationId_idx";
