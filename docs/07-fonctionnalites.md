# Fonctionnalités produit

Cette page décrit les **fonctionnalités métier** du Référentiel des Applications (RefApp), l'outil de la DNUM du ministère de l'Intérieur qui centralise la connaissance des applications numériques du MI. Chaque fonctionnalité est présentée selon le même schéma : **ce qu'elle fait**, **où elle se trouve dans le code** (vue front, composant, module ou endpoint back) et, lorsque c'est pertinent, **la permission requise** (voir [Permissions et sécurité](./06-permissions-et-securite.md)).

Le présent document a été rédigé en confrontant la vue produit aux sources réelles : les vues `frontend/src/views/`, les composants `frontend/src/components/` et les modules `backend/src/`. Les éléments de structure de données sont détaillés dans [Modèle de données](./04-modele-de-donnees.md), l'organisation du front dans [Architecture frontend](./09-architecture-frontend.md) et l'accessibilité dans [Accessibilité RGAA](./10-accessibilite-rgaa.md).

> **Convention de permissions.** Les rôles sont cumulatifs (Visiteur ⊂ Lecteur ⊂ Contributeur ⊂ Administrateur). Une action est autorisée si la permission requise est présente dans l'**une** des trois couches (rôle global, permissions individuelles, permissions par type d'acteur sur l'application). Le détail figure dans [Permissions et sécurité](./06-permissions-et-securite.md).

## Sommaire

- [1. Catalogue et recherche d'applications](#1-catalogue-et-recherche-dapplications)
- [2. Fiche application](#2-fiche-application)
  - [2.1 Informations générales](#21-informations-générales)
  - [2.2 Acteurs](#22-acteurs)
  - [2.3 Cycle de vie et statuts](#23-cycle-de-vie-et-statuts)
  - [2.4 Hébergement](#24-hébergement)
  - [2.5 Conformités](#25-conformités)
  - [2.6 Relations entre applications](#26-relations-entre-applications)
  - [2.7 Liens externes](#27-liens-externes)
  - [2.8 Sources de données](#28-sources-de-données)
- [3. Indice de Qualité (IQ)](#3-indice-de-qualité-iq)
  - [3.1 Campagnes de mise en qualité](#31-campagnes-de-mise-en-qualité)
- [4. Signalements](#4-signalements)
- [5. Abonnements et notifications](#5-abonnements-et-notifications)
- [6. Historique global des modifications](#6-historique-global-des-modifications)
- [7. Tableaux de bord](#7-tableaux-de-bord)
  - [7.1 Qualité générale](#71-qualité-générale)
  - [7.2 Dette technique (Time)](#72-dette-technique-time)
  - [7.3 Suivi des fins de vie](#73-suivi-des-fins-de-vie)
- [8. Export Excel](#8-export-excel)
- [9. Administration](#9-administration)
- [10. Récapitulatif des fonctionnalités et permissions](#10-récapitulatif-des-fonctionnalités-et-permissions)

## 1. Catalogue et recherche d'applications

**Ce que ça fait.** Tout utilisateur connecté recherche, filtre et consulte la liste des applications du ministère, sous forme de **tableau** ou de **cartes**. L'indice de qualité moyen des applications filtrées est affiché en temps réel, et les colonnes du tableau sont personnalisables.

**Filtres disponibles.** La recherche s'appuie sur un endpoint unifié paginé et trié. Les critères vérifiés dans le DTO de recherche sont notamment :

- **texte** : recherche globale (`search`), par label, par nom court (`shortName`) ;
- **classification** : tags, type d'application, priorité de redémarrage (`priorityRestart`) ;
- **acteurs** : type d'acteur (`actorType`), email d'acteur, absence de MOA / MOE (`missingMoa`, `missingMoe`), filtre « Mes applications » (`myApplications`, qui inclut les acteurs de groupe via l'organisation de l'utilisateur), filtre « abonné » (`subscribersEmail`) ;
- **organisation** et **direction métier MOA** ;
- **hébergement** : recherche libre, site, plateforme, fournisseur, bâtiment, salle, absence d'hébergement (`missingHosting`) ;
- **statut** : un ou plusieurs statuts courants, absence de statut ;
- **conformités** : présence sur les axes `dima`, `pdma`, `homologation`, `rgaa`, `dsfr`, `rgpd` ;
- **relations** typées (`is_part_of`, `in_replacement_of`, `is_service_user_of`, `is_data_user_of`, `use_sso_of`, `is_correlated_with`) en mode `INCLUDE` / `EXCLUDE` / `NEUTRAL`, et filtrage par application liée — la corrélation étant symétrique, les deux directions sont considérées ;
- **indice de qualité** : bornes minimale et maximale (`iqGte`, `iqLte`) ;
- **liens** externes (`link`).

**Où c'est dans le code.**

- Front : `frontend/src/views/ApplicationSearchPage.vue` ; vues `ApplicationTableView.vue`, `ApplicationCardView.vue` ; personnalisation `ColumnCustomization.vue` ; barre d'actions `ApplicationSearchActions.vue`.
- Filtres : `frontend/src/components/search/` (`FiltersPanel.vue`, `SidebarFilter.vue`, `ActorFilter.vue`, `ComplianceFilter.vue`, `HostingFilter.vue`, `QualityFilter.vue`, `RelationFilter.vue`, `StatusFilter.vue`, `PriorityRestartFilter.vue`, `DataFilter.vue`, `ApplicationFilter.vue`, `SearchHeader.vue`).
- Back : `GET /applications` (recherche unifiée), `backend/src/applications/dto/search-application.dto.ts`, `backend/src/applications/application.service.ts` (`search`).

**Permission.** `AppList` + `AppRead` (socle Visiteur). Le filtre « Mes applications » repose sur le rattachement de l'utilisateur comme acteur (couche 3).

**Filtres sauvegardés.** Chaque utilisateur peut sauvegarder sa combinaison de filtres courante sous un nom, pour la réappliquer plus tard sans ressaisir chaque critère. Sauvegarder sous un nom déjà utilisé remplace le filtre existant (upsert). Les filtres sont personnels : un utilisateur ne voit et ne peut supprimer que les siens.

- Front : `frontend/src/components/search/SavedFiltersPanel.vue` (intégré dans `SidebarFilter.vue`), store `frontend/src/stores/savedFilterStore.ts`.
- Back : `GET/POST /saved-filters`, `DELETE /saved-filters/:id` (`backend/src/saved-filter/`) ; modèle `SavedFilter` (`backend/prisma/schema/users.prisma`), unique par `(userId, name)`.
- **Permission.** Aucune permission dédiée : accessible à tout utilisateur authentifié, scopé à son propre `userId`.

## 2. Fiche application

La fiche regroupe toutes les informations d'une application sous forme d'onglets. La page de fiche (`ApplicationPage.vue`) délègue au composant `ApplicationOverview.vue`, qui assemble les onglets suivants : **Informations générales**, **Sources de données**, **Liens**, **Conformités**, **Acteurs**, **Technologies**, **Relations**, **Statuts**, **Signalements**, **Modifications** (historique) et **Qualité**. L'affichage de chaque onglet dépend des droits renvoyés par `GET /applications/:applicationId/my-perms`.

La création d'une fiche se fait via `CreateApplicationPage.vue` (`POST /applications`, permission `CreateApplication`). La modification passe par `PATCH /applications/:applicationId` (permissions `AppWrite` ou `AppWritePriority`).

### 2.1 Informations générales

**Ce que ça fait.** Centralise le nom, le nom court (`shortName`), la description (Markdown), le logo, les noms alternatifs (labels), le **type d'application**, les **populations cibles**, les finalités, la **direction métier propriétaire** et la **priorité de redémarrage**. Les dates de création et de dernière modification sont également visibles.

- **Types d'application** (enum `ApplicationType`) : application métier, service socle, intranet citoyen, intranet agent, hub de données.
- **Priorité de redémarrage** (enum `priorityRestart`) : **R0** (immédiat H24), **R1** (dès rétablissement du socle), **R1\*** (`R1_STAR`, selon période d'activité — R1 en activité, R3 en sommeil), **R2** (dès que possible), **R3** (quand le plus urgent est réalisé).

**Où c'est dans le code.** `frontend/src/components/InformationsGenerales.vue` (onglet `tab-infos`) ; édition des noms alternatifs via les composants `label/` ; enum côté schéma `backend/prisma/schema/applications.prisma`.

**Permission.** Lecture : `AppRead`. Écriture des champs : `AppWrite`. La priorité de redémarrage est protégée séparément par `AppWritePriority` (un acteur peut donc modifier la fiche sans toucher à ce champ sensible, ou inversement).

### 2.2 Acteurs

**Ce que ça fait.** Liste les responsables de l'application avec leur rôle (MOA, MOE, TMA, RSSI, responsable d'exploitation, responsable hébergement, Product Owner, DPO, etc.). Chaque acteur est soit une **personne physique** (email, prénom/nom), soit un **groupe** rattaché à une organisation. Les acteurs peuvent être partagés entre applications.

**Où c'est dans le code.** Onglet `tab-actors` → `frontend/src/components/actor/ActorTab.vue` ; composant `ActorActions.vue` ; module back `backend/src/actor/`. Les types d'acteurs sont gérés dans `backend/src/actorType/`.

**Permission.** Lecture : `ActorRead`. Écriture : `ActorWrite`. Le fait d'être acteur d'une application peut conférer des droits contextuels supplémentaires (couche 3, voir [Permissions et sécurité](./06-permissions-et-securite.md)).

### 2.3 Cycle de vie et statuts

**Ce que ça fait.** Trace l'historique des changements d'état. Les statuts (enum `Status`) sont : en construction, à valider, POC, MVP en production, en production, en cours de décommissionnement, décommissionnée, supprimée. Chaque entrée peut porter une date et un numéro de version, ce qui constitue l'historique du cycle de vie.

**Où c'est dans le code.** Onglet `tab-statuses` → `frontend/src/components/StatusTab.vue` ; module back `backend/src/statuses/`.

**Permission.** Lecture : `AppRead`. Écriture : `AppWrite`.

### 2.4 Hébergement

**Ce que ça fait.** Déclare un ou plusieurs hébergements en sélectionnant prestataire, plateforme, site physique et bâtiment/salle dans un référentiel d'options préétabli, avec un indicateur actif/inactif.

**Où c'est dans le code.** Composants `frontend/src/components/hosting/` ; modules back `backend/src/hostings/` (instances) et `backend/src/hosting-option/` (référentiel d'options mutualisées).

**Permission.** Lecture : `HostingRead`. Écriture : `HostingWrite`.

### 2.5 Conformités

**Ce que ça fait.** Regroupe l'état de conformité sur **six axes** renseignés indépendamment :

- **DIMA** (durée d'interruption maximale admissible) : durée de tolérance, impact métier, plan de reprise, solutions de secours ;
- **PDMA** (perte de données maximale admissible) : fréquence et méthode de sauvegarde, types de données, stockage, durée de conservation ;
- **Homologation SSI** : statut (homologuée / en cours / dispensée), date de fin, résultat du dernier test ;
- **RGPD** : réalisation d'une AIPD, DPO référent ;
- **DSFR** : implémentation du Design System de l'État et version ;
- **EcoIndex** : score environnemental (émissions CO₂, consommation d'eau), URL de mesure.

Un onglet dédié **RGAA** (accessibilité) permet d'enregistrer plusieurs audits (score, URL de déclaration, date). Le détail du dispositif RGAA est traité dans [Accessibilité RGAA](./10-accessibilite-rgaa.md).

**Où c'est dans le code.** Onglet `tab-compliances` → composants `frontend/src/components/compliances/` (`ComplianceForm.vue`, `CompliancesAccordionManager.vue`, `RgaaComplianceSection.vue`) ; modules back `backend/src/compliances/` et `backend/src/rgaa/`. Schémas `compliance.prisma` (six axes) et `rgaa-compliance.prisma` (audits RGAA, traités à part).

**Permission.** Lecture : `ComplianceRead`. Écriture : `ComplianceWrite`.

### 2.6 Relations entre applications

**Ce que ça fait.** Déclare des relations typées entre deux applications (enum `RelationType`) : « fait partie de » (`is_part_of`), « remplace » (`in_replacement_of`), « utilise le service de » (`is_service_user_of`), « utilise les données de » (`is_data_user_of`), « utilise le SSO de » (`use_sso_of`), « est corrélée à » (`is_correlated_with`). Les relations sont consultables en liste ou via un **graphe interactif**.

La corrélation (« est corrélée à ») signale un **doublon potentiel** ou un **périmètre proche** entre deux applications. Contrairement aux cinq autres types, elle est **symétrique** : elle se lit à l'identique dans les deux sens, et le libellé affiché est le même côté source et côté cible.

**Où c'est dans le code.** Onglet `tab-relations` → `frontend/src/components/RelationshipsTab.vue` ; graphe `RelationShipGraph.vue` reposant sur le composable `use-d3-graph` (rendu **D3**) ; édition `EditRelationModal.vue` ; module back `backend/src/relationship/`.

> **Écart vs vue produit.** La vue d'ensemble évoque un graphe « d3/mermaid » ; le code utilise exclusivement **D3** (`use-d3-graph`), il n'y a pas de rendu Mermaid pour ce graphe.

**Permission.** Lecture : `RelationRead`. Écriture : `RelationWrite`.

### 2.7 Liens externes

**Ce que ça fait.** Associe à une application plusieurs URLs catégorisées (documentation technique, supervision, URL du service principal, mesure d'audience, autres services), chacune avec une description et un type. Le lien de supervision (Snapvisu) participe au calcul de l'IQ.

**Où c'est dans le code.** Onglet `tab-links` → `frontend/src/components/LinksTab.vue` ; module back `backend/src/links/` (ressources externes, schéma `externals.prisma`).

**Permission.** Lecture : `LinkRead`. Écriture : `LinkWrite`.

### 2.8 Sources de données

**Ce que ça fait.** Associe à une application des jeux de données avec leurs métadonnées : nom, description, indication « donnée de référence », exemples de valeurs, règles de conservation, base et table, nombre de champs, volumétrie et fréquence de mise à jour.

**Où c'est dans le code.** Onglet `tab-data` → `frontend/src/components/data-application/DataApplicationTab.vue` ; module back `backend/src/data-catalog/` (schéma `data.prisma`).

**Permission.** Gestion réservée aux contributeurs et administrateurs (`AppWrite`).

### 2.9 Technologies

**Ce que ça fait.** Déclare la stack technique d'une application : une ligne par couple technologie/produit (famille, produit, version, lien documentaire). La fin de vie de chaque ligne est calculée automatiquement via endoflife.date (cf. [7.3](#73-suivi-des-fins-de-vie)) : badges « Fin de vie », « Fin de vie proche », « Support actif terminé », et états explicites quand le calcul ne peut pas répondre (« Produit non suivi », « Non vérifiée », « Version non reconnue »).

**Saisie manuelle de la fin de vie (#2454).** Quand endoflife.date ne suit pas le produit (logiciel interne, éditeur absent du catalogue) ou est injoignable, le formulaire propose un champ « Fin de vie (saisie manuelle) ». Il n'apparaît que dans ces cas — catalogue indisponible, produit hors catalogue, ligne déjà manuelle, ou ligne existante sans échéance automatique (vérifiée sans résultat ou jamais vérifiée, état « Non vérifiée ») ; sinon la date calculée est seulement rappelée en lecture seule. La date saisie est persistée avec son origine (`eolSource = manual`) et **prime sur l'automatique** : ni le rafraîchissement paresseux ni le recalcul planifié ne la réécrivent, et un changement de produit ou de version ne la détruit pas. Effacer le champ rend la main au calcul, relancé aussitôt. La fiche et la vue transverse signalent l'origine (« saisie manuelle ») ; statuts et alertes s'appliquent à l'identique. Saisie et effacement sont journalisés dans l'onglet Modifications (« fin de vie », « origine de la fin de vie »).

**Où c'est dans le code.** Onglet `tab-technologies` → `frontend/src/components/technology/TechnologyTab.vue` et `TechnologyForm.vue` ; module back `backend/src/technology/` (schéma `technology.prisma`, énumération `TechnologyEolSource`).

**Permission.** Lecture : `TechnologyRead`. Écriture : `TechnologyWrite`.

## 3. Indice de Qualité (IQ)

**Ce que ça fait.** Score automatique de **0 à 100 %** mesurant la complétude/documentation d'une fiche. Il est affiché en temps réel (badge sur la fiche, colonne du catalogue, onglet **Qualité**) et recalculé automatiquement à chaque création/modification d'application.

**Comment c'est calculé.** Le calcul est centralisé dans `backend/src/common/utils/quality.utils.ts` (`calculateIQ`). Il évalue **11 règles** pondérées par trois niveaux d'importance, en comptant le nombre de critères **non satisfaits** par niveau :

- **Importance 1** (critères structurants) : description renseignée, au moins un hébergement déclaré, présence d'un acteur **MOA**.
- **Importance 2** : présence d'un acteur **MOE**, présence d'un acteur **TMA**.
- **Importance 3** : présence d'un acteur **hébergement** (`HEB`), d'un acteur **exploitation** (`REP`), conformité **PDMA** amorcée, conformité **DIMA** amorcée, **homologation** (date de fin) renseignée, lien de supervision **Snapvisu** présent.

Chaque niveau dispose d'un barème dégressif selon le nombre de manques (par exemple 50 / 5 / 3 / 0 / 0 pour l'importance 1), et le score final est la somme des trois sous-scores (plafonné à 100).

**Recalcul.**

- **Automatique** : `application.service.ts` appelle `updateApplicationQuality` lors de la création (≈ ligne 90) et de la mise à jour (≈ ligne 153) d'une application.
- **Global** : l'endpoint `GET /applications/data-quality/update` lance `updateAllApplicationsQualityInBackground` en tâche de fond (réponse `202 Accepted`).
- **Synthèse par fiche** : `GET /applications/:applicationId/quality-summary` alimente l'onglet `tab-quality` (`frontend/src/components/QualityTab.vue`).

**Où c'est dans le code (recalcul global, front).** Onglet d'administration « Indice de qualité » : `frontend/src/components/admin/AdminQualityTab.vue` (bouton « Calculer l'indice de qualité de toutes les applications »).

**Prochaines actions.** L'onglet Qualité affiche, sous le score, une barre de progression colorée (rouge / orange / vert selon le score) avec une phrase incitative (« Encore N actions pour progresser »), puis une checklist des critères IQ non satisfaits (issus de la même `quality-summary`), chacun avec un lien direct vers l'onglet à compléter (Informations générales, Acteurs, Conformités ou Liens). Comme le barème est dégressif par palier (et non additif — cf. ci-dessus), aucun delta de points n'est affiché par critère : seul un niveau d'impact qualitatif (fort / moyen / secondaire, dérivé du palier d'importance 1/2/3) est indiqué, pour rester honnête sur le fait que le gain réel dépend de ce qui est déjà renseigné.

- Front : `frontend/src/components/QualityScoreBar.vue` (barre + phrase) et `frontend/src/components/QualityNextActions.vue` (checklist), logique pure partagée dans `frontend/src/utils/quality-next-actions.ts`, les deux intégrés à `QualityTab.vue`.

**Permission.** Visible par tous (`AppRead`). Recalcul global : **administrateurs** (`AdminPanelManage`).

### 3.1 Campagnes de mise en qualité (#2282)

**Ce que ça fait.** Un administrateur cible un sous-ensemble d'applications via les **mêmes filtres que la recherche du catalogue**, puis crée une campagne (nom, message incitatif optionnel, **liste d'emails sponsors** optionnelle, date de début, date de fin indicative optionnelle). À la date de début — automatiquement via un cron quotidien, ou immédiatement via un déclenchement manuel — la campagne résout les applications correspondant au filtre, **fige leur IQ courant** (`iqAtStart`) par application ciblée, puis relance par email les acteurs **MOA/MOE** de chacune pour les inciter à compléter leur fiche. L'impact de la campagne (IQ moyen au départ vs IQ moyen actuel) est ensuite consultable en continu dans l'onglet admin, sans attendre la date de fin. Les sponsors de la campagne (un ou plusieurs) peuvent à tout moment recevoir un email récapitulatif de cet impact ; ceux disposant d'un compte reçoivent en complément une notification in-app.

**Où c'est dans le code.**

- Back : module `backend/src/quality-campaign/` (`quality-campaign.controller.ts`, `quality-campaign.service.ts` — résolution des cibles via `ApplicationService.search`, snapshot IQ, calcul d'impact), cron `cron/quality-campaign-cron.service.ts` (déclenchement quotidien à la date de début, gated par `EMAIL_CRON_ENABLED`). Schéma `quality-campaign.prisma` (`QualityCampaign.sponsorEmails: String[]`, `QualityCampaignTarget`). Emails : `EmailService.sendQualityCampaignReminderEmail` / `sendQualityCampaignSponsorReportEmail` (un seul email combiné, tous les sponsors en destinataires), templates `email/templates/quality-campaign-*.template.html`. Notifications in-app : `NotificationType.campaign_quality_reminder` (acteurs) et `NotificationType.campaign_quality_sponsor_report` (sponsors ayant un compte `User`).
- Front : point d'entrée `frontend/src/components/modal/CreateQualityCampaignModal.vue` (bouton « Créer une campagne qualité » dans `ApplicationSearchActions.vue`, pré-rempli avec le filtre courant de la recherche) ; gestion `frontend/src/components/admin/AdminQualityCampaignsTab.vue` + `QualityCampaignActions.vue` (onglet admin « Campagnes de mise en qualité ») ; saisie de la liste de sponsors via `frontend/src/components/form/SponsorEmailsInput.vue` (partagé entre création et édition) ; store `frontend/src/stores/qualityCampaignStore.ts`.

**Permission.** Création, gestion, déclenchement manuel : **administrateurs** (`AdminPanelManage`).

## 4. Signalements

**Ce que ça fait.** Permet de signaler une erreur ou une information manquante. Deux natures :

- **Signalement par application** : créé depuis la fiche, rattaché à l'application, visible dans son onglet « Signalements » ;
- **Signalement global** : non rattaché à une application, soumis à une permission dédiée.

Les contributeurs et administrateurs consultent l'ensemble des signalements, les commentent via des **notes** et font évoluer leur **statut** (en attente, en cours, traité). Une vue « Mes signalements » suit ceux que l'on a soumis. Des **notifications email** sont envoyées lors des changements d'état selon les préférences de l'utilisateur.

**Où c'est dans le code.**

- Front : `frontend/src/views/ReportsPage.vue` ; onglet de fiche `frontend/src/components/ApplicationReportsTab.vue` ; composants `frontend/src/components/Report/`.
- Back : `backend/src/report/report.controller.ts` (`GET`/`POST`/`PATCH`/`DELETE`), `report.service.ts`, et `user-notification.service.ts` (envoi d'email via `EmailService` à la transition de statut, conditionné par les préférences).

**Permissions.**

- Lecture des signalements : `ReportRead` (socle Visiteur).
- Soumission sur une application : `ReportPost` (socle Visiteur).
- Signalement **global** : `CreateGlobalReport` (Contributeur+).
- Gestion (changement de statut, notes, suppression) : `ReportManage` (Contributeur+).

## 5. Abonnements et notifications

**Ce que ça fait.** Depuis une fiche, l'utilisateur **s'abonne** pour être notifié par email à chaque modification, et se désabonne à tout moment. La liste des applications suivies est consultable dans le profil (onglet « Mes abonnements »), et le catalogue peut être filtré sur les applications suivies.

**Où c'est dans le code.**

- Back : `POST /users/me/subscribe/:appId` et `DELETE /users/me/subscribe/:appId` (`backend/src/user/user.controller.ts`, `userService.subscribe` / `unsubscribe`).
- Front : profil `frontend/src/views/UserProfilePage.vue` (onglet `tab-content-followapp`, « Mes abonnements ») ; filtre catalogue `subscribersEmail`.

**Permission.** Tous les utilisateurs connectés (action sur son propre compte).

> **Note de terminologie.** Le commit `569430a8` parle de « favoris », mais l'implémentation effective repose sur le mécanisme d'**abonnement** (`subscribe`/`unsubscribe`) ci-dessus ; il n'existe pas d'entité « favori » distincte dans le code.

### 5.1 Centre de notifications in-app (#2280)

**Ce que ça fait.** En complément de l'email (canal principal), une cloche dans l'en-tête affiche un badge du nombre de notifications non lues. Un clic ouvre un panneau listant les événements récents pertinents pour l'utilisateur connecté (lu/non-lu distingués visuellement), avec une action « Tout marquer comme lu » et un lien vers l'historique complet (`/notifications`). Événements couverts : signalement créé (aux gestionnaires `ReportManage`) ou traité (à son auteur), acteur ajouté/modifié, application suivie modifiée, rappel de validation de fiche, organisation/permissions changées, compte bloqué/débloqué, campagne qualité (relance envoyée à l'acteur ciblé, rapport de résultats envoyé au sponsor — voir [3.1](#31-campagnes-de-mise-en-qualité)). Pas de rafraîchissement en tâche de fond : le compteur se met à jour à chaque navigation.

**Où c'est dans le code.**

- Back : module `backend/src/notification/` (`notification.controller.ts`, `notification.service.ts` — persistance, pagination, `findUsersWithReportManagePermission`) ; déclenché en complément de chaque email existant (`report/user-notification.service.ts`, `actor/actor.service.ts`, `user/user.service.ts`, `email/cron/email-cron.service.ts`, `email/cron/application-validation-cron.service.ts`). Schéma `notification.prisma` (`Notification`, `NotificationType`).
- Front : `frontend/src/stores/notificationStore.ts` ; cloche `frontend/src/components/notification/NotificationBell.vue` (slot `#after-quick-links` de `App.vue`) ; historique `frontend/src/views/NotificationsPage.vue`.

**Permission.** Tous les utilisateurs connectés (notifications scopées à l'utilisateur courant).

**Fins de vie (#2236, #2519).** Le centre reçoit aussi les alertes `technology_end_of_life` : un cron propre (3 h 30, `TECHNOLOGY_EOL_NOTIFY_ENABLED`) prévient les acteurs porteurs de `TechnologyWrite` de chaque application dont une technologie franchit un palier (fin de vie, proche, hors support actif), une fois par technologie, statut et échéance (`NotificationLog`, cf. §2.9).

## 6. Historique global des modifications

**Ce que ça fait.** Journal d'audit transverse : chaque création, modification ou suppression d'information est tracée avec l'auteur, son organisation, la date et le type d'action. La page « Historique global » liste l'ensemble des événements, **filtrable par période** ; le détail d'une entrée est consultable.

**Où c'est dans le code.**

- Front : liste `frontend/src/views/MetadataPage.vue`, détail `frontend/src/views/MetadataDetailPage.vue` ; onglet de fiche `frontend/src/components/ApplicationMetadatasTab.vue`.
- Back : `backend/src/metadatas/metadatas.controller.ts` — `GET /metadatas` (filtrable), `GET /metadatas/:id`, et `GET /metadatas/.../first-last` (bornes de période). Schéma `metadata.prisma`.

**Permission.** Lecture : `MetadataRead` (socle Lecteur). Pas d'écriture manuelle : les métadonnées sont générées automatiquement.

## 7. Tableaux de bord

### 7.1 Qualité générale

**Ce que ça fait.** Vue synthétique de l'état du référentiel : totaux (applications, acteurs, conformités, hébergements), répartition des applications par indice de qualité, évolution mensuelle du nombre d'applications créées, et tendance de l'IQ moyen dans le temps.

**Où c'est dans le code.**

- Front : `frontend/src/views/QualityPage.vue`, composée de `stats/GlobalStats.vue` (totaux), `stats/ApplicationsIqChart.vue` (répartition par IQ), `stats/ApplicationsChart.vue` (créations mensuelles) et `stats/IqChart.vue` (tendance IQ).
- Back : `GET /applications/count-by-month`, `GET /applications/count-by-iq`, et `GET /stats/iq-avg/period` (`backend/src/stats/interfaces/stats.controller.ts`, paramètres `from`/`to`/`groupBy` : jour, semaine, mois, année).

**Permission.** Tous les utilisateurs connectés.

### 7.2 Dette technique (Time)

**Ce que ça fait.** Diagramme interactif positionnant les applications selon leur **maturité technique**, **maturité métier** et **maturité coût** (les informations de dette technique saisies). Les **mêmes filtres** que la recherche d'applications s'appliquent.

**Où c'est dans le code.**

- Front : `frontend/src/views/TimePage.vue`, graphe `frontend/src/components/technical-debt/TechnicalDebtChart.vue`, données via le composable `use-application-search` (`fetchTechnicalDebtPoints`).
- Back : `backend/src/technical-debt-info/` ; endpoint des points de dette `GET /technical-debts` (`technical-debt.controller.ts`).

**Permission.** `MDITList` (« Voir la liste des MDIT »), incluse dans le socle Lecteur et pouvant être configurée selon un périmètre organisationnel.

### 7.3 Suivi des fins de vie

**Ce que ça fait.** Vue transverse répondant à « quelles applications utilisent une technologie en fin de vie ? ». Elle liste les applications dont au moins une technologie est **en fin de vie**, le sera **dans moins de 6 mois**, ou est **sortie du support actif** — l'information n'existait jusque-là que fiche par fiche, dans l'onglet « Technologies » de la fiche application. La vue est servie par l'entrée de menu « Technologies » (#2413, à la demande du PO ; le titre de page et l'onglet de la fiche suivent le même intitulé). Filtres par statut, par organisation (chemin ou sigle d'un acteur, en correspondance partielle : un chemin de direction ramène ses organisations filles) et par recherche libre sur le libellé d'application ou le produit.

Les trois statuts **partitionnent** la liste : une technologie déjà en fin de vie n'apparaît pas aussi sous « fin de support actif ». Le classement est calculé côté serveur, pour que la vue transverse et la fiche s'accordent sur le statut d'une même technologie.

**Fraîcheur des données.** La résolution endoflife.date est écrite sur `TechnologyStack` puis rafraîchie de deux façons :

- **paresseusement**, au GET d'une fiche, pour les technologies de cette fiche (TTL 7 jours) ;
- **globalement**, par le cron `EolRefreshService` (3 h du matin, `TECHNOLOGY_EOL_CRON_ENABLED`). Sans lui, une application que personne ne consulte ne serait jamais recalculée — précisément celle qu'une vue transverse doit signaler.

Le cron ne résout qu'**une fois par produit distinct** pour tout le run, et n'écrit rien lorsqu'endoflife.date ne répond pas : écraser une date valide par `null` et réarmer le TTL figerait la ligne une semaine sur une donnée non vérifiée.

Les lignes dont la fin de vie a été **saisie à la main** (`eolSource = manual`, #2454, cf. [2.9](#29-technologies)) sont exclues des deux rafraîchissements : la date d'un humain prime sur le calcul et n'est jamais réécrite ; seul l'effacement de la saisie rend la main à l'automatique. La vue les classe comme les autres et signale leur origine (« saisie manuelle »).

**Résolution du produit et de la version.** Le produit saisi librement est rapporté à un slug endoflife.date via le catalogue (noms, libellés, alias officiels), complété d'alias internes pour les saisies courantes que le catalogue ne couvre pas (« SQL Server », « .NET », « Postgres », « Java » → Oracle JDK, « OpenJDK » → Eclipse Temurin). La version est ensuite rapportée à un cycle de release, dans l'ordre : nom de cycle exact ou préfixe (« 20.11 » → 20), major seul si un unique cycle le porte (« 9 » → Tomcat 9.0), libellé commercial (« 2019 » → SQL Server 15.0), nom de code (« bookworm » → Debian 12). Un préfixe « v » est ignoré. Une version trop imprécise pour désigner un cycle (« Python 3 », « MySQL 8 » dont 8.0 et 8.4 n'ont pas la même échéance) ne reçoit **aucune date** : mieux vaut rien qu'une échéance empruntée à un autre cycle. Le cycle apparié est persisté (`eolCycle`, #2449) : produit suivi, version saisie mais aucun cycle apparié, la fiche affiche **« Version non reconnue »** et invite à préciser la saisie, là où un cycle connu sans échéance publiée (Apache 2.4) reste à « — » — des dates nulles seules ne distinguaient pas les deux.

**Indisponibilité d'endoflife.date.** Un échec réseau ou HTTP (délai dépassé, connexion absorbée par un proxy, 5xx, 404 sur l'URL du catalogue) ouvre un **disjoncteur** d'une minute (#2513) : pendant ce délai, aucune requête n'est tentée et toute résolution répond aussitôt « indisponible » — sans lui, chaque ouverture d'onglet ou enregistrement sans date manuelle attendait deux délais de cinq secondes. « Indisponible » n'écrit **rien** : la fin de vie existante n'est ni effacée ni son TTL réarmé, la ligne est retentée au prochain GET. Deux exceptions volontaires : quand le produit **ou** la version change pendant la panne, la ligne repasse « Non vérifiée » (#2516) — l'ancienne échéance ne vaut plus rien pour le nouveau produit et un `eolCheckedAt` frais l'aurait figée sept jours ; et sans catalogue (mode dégradé), un 404 sur un slug deviné vaut « indisponible » et non « Produit non suivi » (#2514) — la normalisation historique supprime les tirets que près de la moitié des slugs réels contiennent, et un proxy filtrant peut répondre 404 à tout. « Produit non suivi » n'est persisté qu'avec un catalogue en main.

**Applications supprimées.** La vue transverse et son total, les alertes in-app et le recalcul planifié ignorent les technologies d'une application au statut « supprimée » (#2515), comme la recherche du catalogue (`ACTIVE_APPLICATION_WHERE`, `backend/src/technology/utils/eol-status.ts`). La fiche elle-même reste consultable.

**Où c'est dans le code.**

- Front : `frontend/src/views/EndOfLifePage.vue` (route `/fins-de-vie`, inchangée par #2413 : seul l'intitulé a bougé), store `frontend/src/stores/endOfLifeStore.ts`.
- Back : `GET /technologies/end-of-life` (`backend/src/technology/end-of-life.controller.ts`), service `end-of-life.service.ts`, règles de classement `utils/eol-status.ts`, recalcul planifié `eol-refresh.service.ts`.

**Tri.** Par libellé d'application. Trier par gravité supposerait d'ordonner sur un agrégat de la relation (la fin de vie la plus proche), ce que Prisma ne sait pas faire : un tri appliqué après pagination ne classerait que la page affichée et donnerait l'illusion d'un classement global. Pour cibler l'urgent, c'est le filtre de statut qui répond.

**Alertes aux gestionnaires.** `EolNotificationService` prévient, via le centre de notifications
in-app, les acteurs dont le type porte `TechnologyWrite` — ceux qui peuvent agir sur la stack. Une
entrée de `NotificationLog` par technologie **et par statut** garantit une alerte par palier franchi,
jamais une par exécution. La passe est séparée du rafraîchissement : un statut change aussi par
simple **écoulement du temps**, sans que la ligne soit réécrite, et c'est le cas le plus courant —
une échéance connue de longue date qui arrive à terme. Interrupteur dédié
`TECHNOLOGY_EOL_NOTIFY_ENABLED`, distinct de celui du recalcul — et depuis #2519 planifié à part (`EolNotificationService`, 3 h 30, indépendant de `TECHNOLOGY_EOL_CRON_ENABLED` et d'`ENDOFLIFE_ENABLED` : les saisies manuelles sont alertées même sans appel à endoflife.date). L'anti-répétition (`NotificationLog`) porte sur technologie + statut + **échéance** (#2518) : une montée de version ou une date ressaisie redonne droit à une alerte, et rien n'est journalisé tant que les notifications n'ont pas été créées. Recalculer est interne, prévenir des
utilisateurs est visible.

**Pourquoi les fins de vie n'entrent PAS dans l'IQ ni dans la maturité technique.** La question était
posée par #2236 ; la réponse est non, dans les deux cas.

- L'**IQ** mesure la complétude documentaire d'une fiche. Y injecter la fin de vie ferait baisser le
  score d'une fiche parfaitement remplie au motif qu'elle **déclare honnêtement** une technologie
  périmée : cela reviendrait à récompenser l'omission de sa stack technique. L'effet pervers est
  direct et contraire au but du référentiel.
- La **maturité technique** (`TechnicalDebtInfo`) est une **note humaine de 1 à 5**, saisie lors de
  la campagne annuelle « dette IT ». La dériver d'un calcul écraserait l'évaluation des métiers.

L'exposition aux fins de vie est donc restituée **à côté** des indicateurs, jamais dedans : par cette
vue, et par un compteur « Applications concernées par une fin de vie » dans les statistiques
globales. Un constat, pas une note.

**Permission.** Tous les utilisateurs connectés, comme l'historique global. `TechnologyRead` n'existe qu'à l'échelle d'une application et ne peut pas garder une route sans `:applicationId` ; l'ajouter au socle global la donnerait à un lecteur scopé sur les applications **hors** de son périmètre. Si la donnée devait être restreinte, il faudrait une permission dédiée plutôt que le détournement d'une permission existante.

## 8. Export Excel

**Ce que ça fait.** Export au format Excel des résultats de recherche (avec les filtres en cours) ou de l'intégralité du référentiel.

**Où c'est dans le code.** `GET /applications/export/excel` (`backend/src/applications/application.controller.ts`) ; services `ApplicationExportService` (export filtré, `exportSearchResultsToExcel`) et `ExportApplicationsUseCase` (export total). Le fichier est renvoyé en pièce jointe `applications_export.xlsx`. Déclenchement depuis `ApplicationSearchActions.vue`.

**Permission.** `DataExport` (**administrateurs**).

## 9. Administration

Le panneau d'administration (`frontend/src/views/AdminPage.vue`) est organisé en onglets, réservés aux administrateurs (`AdminPanelManage`).

- **Gestion des utilisateurs** (`admin/AdminUsersTab.vue`) : liste des utilisateurs (humains et comptes techniques), modification du rôle (Visiteur, Lecteur, Contributeur, Administrateur), rattachement à une organisation, et attribution de **permissions individuelles** complémentaires (couche 2). Un utilisateur peut aussi être **bloqué** (ex : a quitté le ministère) via `POST /users/:id/block` / `POST /users/:id/unblock` : un utilisateur bloqué est rejeté par `AuthMiddleware` à l'authentification (JWT SSO ou token API), quel que soit son moyen d'accès ; un administrateur ne peut pas bloquer son propre compte, ni impersonner un utilisateur bloqué. Notification par email à chaque changement d'état. Module back `backend/src/user/`.
- **Gestion des organisations** (`admin/AdminOrganizationsTab.vue`) : création/modification/suppression, rattachement d'une **direction métier** à l'organisation. Permission `OrganizationManage`. Modules `backend/src/organizations/`, `backend/src/organization-maia-references/`.
- **Directions métier** (`admin/AdminBusinessDivisionsTab.vue`) : création/modification/suppression des directions métier (nom unique) rattachables aux organisations et aux applications. Écritures sous `AdminPanelManage`. Module `backend/src/business-division/`.
- **Gestion des tags** (`admin/AdminTagsTab.vue`) : tags libres attachables aux applications. Module `backend/src/tag/`.
- **Gestion des sources** (`admin/AdminLabelSourcesTab.vue`) : sources contextualisant les noms alternatifs (labels). Modules `backend/src/labels/`, `backend/src/label-source/`.
- **Indice de qualité** (`admin/AdminQualityTab.vue`) : recalcul global de l'IQ (voir [section 3](#3-indice-de-qualité-iq)).
- **Revue des corrélations** (`admin/AdminCorrelationsTab.vue`) : suggestions de rapprochement entre applications proches (doublons potentiels), détectées automatiquement à partir de la similarité des noms, des données partagées et des acteurs communs. Chaque suggestion affiche la paire, le score et le détail des signaux ; l'administrateur accepte (la relation `is_correlated_with` apparaît alors sur les deux fiches) ou rejette (la paire n'est plus proposée). La détection peut aussi être lancée à la demande. Permission `AdminPanelManage`. Module `backend/src/relationship/correlation/`.
- **Matrice des permissions** (`admin/AdminPermsMatrixTab.vue`) : pour chaque **type d'acteur** (MOA, MOE, TMA, RSSI, etc.), définition des droits de lecture/écriture conférés sur la fiche (informations générales, hébergements, conformités, acteurs, relations, liens, historique, priorité de redémarrage). C'est la **couche 3** du système de permissions ; voir [Permissions et sécurité](./06-permissions-et-securite.md).

**Permission.** L'ensemble du panneau requiert `AdminPanelManage`. La suppression d'application (`DELETE /applications/:applicationId`) et certaines actions (création de type d'acteur) relèvent également de droits administrateurs.

## 10. Récapitulatif des fonctionnalités et permissions

| Fonctionnalité                      | Emplacement principal (code)                                                    | Permission requise                                                                 |
| :---------------------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- |
| Catalogue et recherche              | `ApplicationSearchPage.vue` · `GET /applications`                               | `AppList` + `AppRead`                                                              |
| Filtres sauvegardés                 | `SavedFiltersPanel.vue` · `backend/src/saved-filter`                            | utilisateur connecté                                                               |
| Fiche – Informations générales      | `InformationsGenerales.vue`                                                     | Lecture `AppRead` · Écriture `AppWrite` / `AppWritePriority`                       |
| Fiche – Acteurs                     | `actor/ActorTab.vue` · `backend/src/actor`                                      | `ActorRead` / `ActorWrite`                                                         |
| Fiche – Statuts                     | `StatusTab.vue` · `backend/src/statuses`                                        | `AppRead` / `AppWrite`                                                             |
| Fiche – Hébergement                 | `hosting/` · `backend/src/hostings`                                             | `HostingRead` / `HostingWrite`                                                     |
| Fiche – Conformités (6 axes)        | `compliances/` · `backend/src/compliances`                                      | `ComplianceRead` / `ComplianceWrite`                                               |
| Fiche – RGAA                        | `compliances/RgaaComplianceSection.vue` · `backend/src/rgaa`                    | voir [./10](./10-accessibilite-rgaa.md)                                            |
| Fiche – Relations (graphe D3)       | `RelationshipsTab.vue` · `RelationShipGraph.vue`                                | `RelationRead` / `RelationWrite`                                                   |
| Fiche – Liens externes              | `LinksTab.vue` · `backend/src/links`                                            | `LinkRead` / `LinkWrite`                                                           |
| Fiche – Sources de données          | `data-application/DataApplicationTab.vue`                                       | `AppWrite` (Contributeur+)                                                         |
| Fiche – Technologies et fins de vie | `technology/TechnologyTab.vue` · `EndOfLifePage.vue` · `backend/src/technology` | `TechnologyRead` / `TechnologyWrite` · vue transverse : utilisateur connecté       |
| Indice de Qualité                   | `quality.utils.ts` · `QualityTab.vue`                                           | Lecture `AppRead` · Recalcul global `AdminPanelManage`                             |
| Campagnes de mise en qualité        | `backend/src/quality-campaign` · `AdminQualityCampaignsTab.vue`                 | `AdminPanelManage`                                                                 |
| Signalements                        | `ReportsPage.vue` · `backend/src/report`                                        | `ReportRead` / `ReportPost` · gestion `ReportManage` · global `CreateGlobalReport` |
| Abonnements / notifications         | `UserProfilePage.vue` · `POST /users/me/subscribe/:appId`                       | utilisateur connecté                                                               |
| Historique global                   | `MetadataPage.vue` · `backend/src/metadatas`                                    | `MetadataRead`                                                                     |
| Tableau de bord Qualité             | `QualityPage.vue` · `GET /stats/iq-avg/period`                                  | utilisateur connecté                                                               |
| Diagramme Time (dette technique)    | `TimePage.vue` · `backend/src/technical-debt-info`                              | `MDITList`                                                                         |
| Export Excel                        | `GET /applications/export/excel`                                                | `DataExport` (admin)                                                               |
| Administration                      | `AdminPage.vue` · `backend/src/user`, `organizations`, `tag`, `permissions`     | `AdminPanelManage` (+ `OrganizationManage`, etc.)                                  |

---

**Voir aussi :** [Modèle de données](./04-modele-de-donnees.md) · [Permissions et sécurité](./06-permissions-et-securite.md) · [Architecture frontend](./09-architecture-frontend.md) · [Accessibilité RGAA](./10-accessibilite-rgaa.md).
