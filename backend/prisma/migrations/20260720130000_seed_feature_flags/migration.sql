-- Peuplement initial des feature flags du catalogue.
-- En production seul `prisma migrate deploy` s'exécute (le seed ne tourne pas) :
-- cette data-migration garantit donc que les flags existent et sont listables /
-- togglables dès le déploiement. `ON CONFLICT DO NOTHING` préserve tout état déjà
-- présent (ex. environnements de dev déjà seedés). Les fonctionnalités existantes
-- sont activées par défaut pour ne rien masquer une fois les flags câblés ;
-- `fulltext-search` (expérimental) reste désactivé.
INSERT INTO "FeatureFlag" ("key", "label", "description", "enabled", "updatedAt")
VALUES
  ('fulltext-search',      $$Recherche full-text$$,         $$Active la recherche plein texte des applications (barre de recherche globale).$$, false, CURRENT_TIMESTAMP),
  ('impersonation',        $$Impersonation$$,               $$Autorise un administrateur à se faire passer pour un autre utilisateur.$$,        true,  CURRENT_TIMESTAMP),
  ('excel-import',         $$Import Excel$$,                $$Import et traitement par lot des applications via fichier Excel.$$,               true,  CURRENT_TIMESTAMP),
  ('email-notifications',  $$Notifications email$$,         $$Envoi des notifications par email (validation, suivi).$$,                         true,  CURRENT_TIMESTAMP),
  ('data-catalog',         $$Catalogue de données$$,        $$Onglet « Données » de la fiche application et pages du catalogue.$$,              true,  CURRENT_TIMESTAMP),
  ('technology-stack',     $$Stack technique$$,             $$Onglet « Stack technique » par technologie et intégration fin de vie.$$,          true,  CURRENT_TIMESTAMP),
  ('compliances',          $$Conformités$$,                 $$Onglet « Conformités » de la fiche application.$$,                                true,  CURRENT_TIMESTAMP),
  ('actors',               $$Acteurs$$,                     $$Onglet « Acteurs » de la fiche application.$$,                                    true,  CURRENT_TIMESTAMP),
  ('relations',            $$Relations$$,                   $$Onglet « Relations » entre applications.$$,                                       true,  CURRENT_TIMESTAMP),
  ('links',                $$Liens$$,                       $$Onglet « Liens » externes de la fiche application.$$,                             true,  CURRENT_TIMESTAMP),
  ('reports',              $$Signalements$$,                $$Onglet « Signalements » et page dédiée.$$,                                        true,  CURRENT_TIMESTAMP),
  ('application-history',  $$Historique des modifications$$, $$Onglet « Modifications » de la fiche application.$$,                             true,  CURRENT_TIMESTAMP),
  ('quality-dashboard',    $$Tableau de bord Qualité$$,     $$Onglet et page Qualité (indicateurs).$$,                                          true,  CURRENT_TIMESTAMP),
  ('rgaa-accessibility',   $$Déclaration d'accessibilité$$, $$Page de déclaration d'accessibilité / RGAA.$$,                                    true,  CURRENT_TIMESTAMP),
  ('mdit-campaigns',       $$Campagnes de dette IT$$,       $$Onglet d'administration des campagnes et sélecteur de millésime.$$,               true,  CURRENT_TIMESTAMP),
  ('tags-management',      $$Gestion des tags$$,            $$Onglet d'administration des tags.$$,                                              true,  CURRENT_TIMESTAMP),
  ('permissions-matrix',   $$Matrice des permissions$$,     $$Onglet d'administration de la matrice des permissions.$$,                         true,  CURRENT_TIMESTAMP),
  ('api-tokens',           $$Tokens d'API$$,                $$Onglet d'administration des tokens d'API.$$,                                      true,  CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
