# Permissions et sécurité

Cette page décrit le **modèle d'authentification et d'autorisation** du **Référentiel des Applications (RefApp)**, ainsi que les bonnes pratiques de sécurité associées. Elle a été rédigée en vérifiant chaque mécanisme directement dans le code du backend NestJS et du frontend Vue.

Le principe directeur est un modèle d'autorisation **à trois couches cumulatives** : les droits d'un utilisateur sont l'**union** de ses droits de rôle, de ses permissions individuelles et des permissions héritées de son statut d'acteur sur une application donnée. La décision finale suit une **sémantique OU** : il suffit de posséder _l'une_ des permissions requises pour qu'un accès soit accordé.

> Pour les entités manipulées ici (`Actor`, `ActorType`, `Organization`, `User`), se reporter au [Modèle de données](./04-modele-de-donnees.md). L'architecture générale est décrite dans [Architecture](./02-architecture.md) et [Architecture backend](./08-architecture-backend.md), l'API dans [API](./05-api.md).

## Sommaire

- [1. Authentification](#1-authentification)
- [2. Modèle d'autorisation à trois couches](#2-modèle-dautorisation-à-trois-couches)
- [3. Rôles et mapping des permissions](#3-rôles-et-mapping-des-permissions)
- [4. Catalogue de l'énumération Permission](#4-catalogue-de-lénumération-permission)
- [5. Permissions par type d'acteur](#5-permissions-par-type-dacteur)
- [6. Scope administratif (périmètre organisationnel)](#6-scope-administratif-périmètre-organisationnel)
- [7. Mise en œuvre côté code](#7-mise-en-œuvre-côté-code)
- [8. Bonnes pratiques de sécurité](#8-bonnes-pratiques-de-sécurité)

## 1. Authentification

L'authentification repose sur un **OIDC standard (Authorization Code Flow), agnostique du fournisseur** (configuré par variables d'environnement `OIDC_JWKS_URL` / `OIDC_CONFIG_URL` / `OIDC_CLIENT_ID`), avec une vérification de jeton **JWT côté backend**. **En développement**, le fournisseur OIDC est un **Keycloak local** (realm `referentiel-applications` fourni dans `keycloak/`) ; **en production**, l'application s'interface avec le **fournisseur d'identité (SSO) de l'organisation** via ces mêmes variables. L'**email** est l'identifiant pivot des utilisateurs (`email @unique` dans `backend/prisma/schema/users.prisma`).

### 1.1. Chaîne d'authentification

```mermaid
flowchart LR
  U[Utilisateur] -->|login OIDC| IDP[Fournisseur OIDC\nKeycloak en dev · SSO de l'organisation en prod]
  IDP -->|JWT| FE[Frontend Vue\noidc-client-ts]
  FE -->|Authorization: Bearer JWT| BE[Backend NestJS\nAuthMiddleware]
  BE -->|vérif JWT via JWKS\n+ pivot email| BE
```

> La validation des jetons JWT est assurée directement dans le backend (voir §1.3).

### 1.2. Frontend (oidc-client-ts)

Le frontend pilote le flux **Authorization Code** via la librairie `oidc-client-ts`. Le `UserManager` est instancié dans `frontend/src/services/authentication.ts` :

- L'autorité OIDC et le `client_id` ne sont **pas codés en dur** : ils sont récupérés au démarrage auprès du backend (`getConfig()`), puis l'autorité est dérivée en retirant le suffixe `/.well-known/openid-configuration` de `oidcConfigUrl` (`authentication.ts:15`).
- Configuration du `UserManager` (`authentication.ts:17-26`) : `response_type: "code"`, `scope: "openid profile email"`, `redirect_uri` pointant vers `/oidc/callback`.
- Le `userStore` (Pinia) écoute les évènements OIDC (`addUserLoaded` / `addUserUnloaded`) pour maintenir l'état d'authentification et recharger le profil utilisateur (`frontend/src/stores/userStore.ts:13-28`).

> **Piège connu.** `oidc-client-ts` (comme `keycloak-js`) exige un **contexte HTTPS**. En HTTP simple, l'authentification se dégrade : boucles de redirection 302 et 401 intermittents. Toujours servir le frontend derrière TLS hors développement local.

### 1.3. Backend (AuthMiddleware)

Le backend revérifie systématiquement le jeton dans `backend/src/middlewares/auth.middleware.ts` (le middleware est branché dans `backend/src/app.module.ts`) :

- Le JWKS est chargé une fois au constructeur via `createRemoteJWKSet(new URL(this.oidc.jwksUrl))` (`auth.middleware.ts:37`).
- Deux modes d'authentification (`auth.middleware.ts:42-56`) :
  - **Jeton API** (en-tête `API_KEY_HEADER`) → résolution via `TokenService.findUserByToken`.
  - **Bearer JWT** → vérification `jwtVerify(authorization, this.jwks)`, puis `findOrCreateByEmail(payload.email)` (provisionnement à la volée de l'utilisateur sur la base de son email). L'e-mail est **normalisé en minuscules** avant recherche et création, et la recherche est insensible à la casse (#2501) : deux graphies du même compte ne créent plus deux utilisateurs. L'**email est l'identifiant pivot** : le modèle `User` n'a plus de champ `keycloakId` (l'`id` UUID interne reste la clé de liaison).
- Échappatoire de développement : si `DISABLE_JWT_VALIDATION` est défini, le jeton est seulement **décodé** (`decodeJwt`) sans vérification de signature (`auth.middleware.ts:50-52`). À n'utiliser qu'en local.
- En cas d'absence d'utilisateur, réponse **401**. Sur exception, `UnauthorizedException`.
- Une fois l'utilisateur résolu, le middleware calcule ses permissions de rôle et les attache à la requête :
  `req.user = { ...user, permissions: roleToPermissions(user.role) }` (`auth.middleware.ts:63-66`).
- Chaque passage est journalisé via `UserConnexionLogService.log(user.id)` (une entrée par utilisateur par jour, cf. `UserConnexionLog`).

La configuration OIDC backend est centralisée dans `backend/src/config/configs/oidc.config.ts` : `OIDC_JWKS_URL`, `OIDC_CONFIG_URL` et `OIDC_CLIENT_ID` sont **obligatoires** (le service lève une erreur au démarrage s'ils manquent). Cette configuration étant générique, le même code fonctionne avec le **Keycloak local** (dev) comme avec le **fournisseur d'identité (SSO) de l'organisation** (prod) : aucun fournisseur n'est codé en dur.

### 1.4. Niveau d'authentification : carte agent ou double authentification (#1985)

Le SSO de l'organisation admet plusieurs modes de connexion (carte agent, mot de passe avec double authentification, mot de passe seul). RefApp lit, sur l'**access token**, puis sur `userinfo` si le repli est activé et si le mode manque (jamais l'id token, cf. ADR-0005), un claim de mode d'authentification déclaré côté fournisseur — nom et valeurs fortes entièrement configurables (`AUTH_LEVEL_*`, voir [API](./05-api.md)) — et en déduit un niveau `strong`, `weak` ou `unknown` (module pur `backend/src/auth-level/auth-level.ts`). Un claim absent vaut toujours **faible** ; une liste explicite de fournisseurs fédérés de confiance (`AUTH_LEVEL_TRUSTED_IDPS`, vide par défaut) ne comble que l'absence de mode après ce repli, jamais un mode faible transmis par l'une des deux sources. Le repli exige un sujet non vide dans le jeton de référence et identique dans `userinfo` ; une réponse signée doit aussi porter l’émetteur du jeton et l’audience du client. Trois modes (`AUTH_LEVEL_MODE`) : `off` (défaut, aucune évaluation), `observe` (niveau journalisé et exposé, droits intacts — l'étape de mesure avant toute activation, cf. le runbook d'[Exploitation](./12-exploitation-deploiement.md)) et `enforce`.

En `enforce`, une session non forte ne porte que les **droits d'un utilisateur standard**, en cinq points de coupe :

- **Réécriture du principal** dans `AuthMiddleware` (`stepDownPrincipal`) : rôle `VISITOR`, `additionalPermissions` vides, périmètre annulé (identifiant **et** relation `scopeOrganization`), **en mémoire uniquement**, avant `principalToPermissions`, avant l'impersonation et avant le journal. L'e-mail et l'organisation sont conservés (couche 3, traçabilité). Le jeton API (`x-refapp-token`) n'est **jamais** évalué.
- **Couche 3 ramenée aux lectures** dans `CheckPermissions.resolveAppPermissions` (point d'entrée unique de la garde et de `my-perms`) : un acteur en écriture sur ses applications ne conserve que les permissions applicatives de lecture.
- **Impersonation refusée** par le middleware avec un 403 `{ stepDown: true, reason: "impersonation" }` (jamais 401, qui déclencherait la ré-authentification du front) et clôture de la session `ImpersonationLog` ouverte.
- **Création de jeton personnel refusée** (`TokenService.create`, 403 `stepDown` / `personal-token`) : un jeton est un secret durable qui contournerait ensuite tout contrôle de niveau.
- **Second rideau** dans `ScopedPermissionService.assertIsAdministrator` (403 `stepDown` / `admin-action`), derrière la garde `AdminPanelManage` qui refuse déjà.

`GET /users/me` expose `authLevel { level, downgraded, reason }` — jamais le rôle, les permissions ou le périmètre d'origine — et les routes qui décrivent l'utilisateur courant (`PATCH /users/me`, abonnements) répondent depuis le Requestor de la requête, pas d'une relecture Prisma. `UserConnexionLog` enregistre une ligne par utilisateur, jour et contexte (niveau, mode, fournisseur et source) avec la valeur brute du claim, le fournisseur et la source (`authSource` : `token`, `userinfo`, ou `null` si inconnue). Deux valeurs encore classées faibles sont conservées séparément ; les requêtes répétées et concurrentes du même contexte sont dédoublonnées. Les anciennes lignes gardent une source inconnue, sans attribution rétrospective.

`GET /users/:id/connexion-logs` expose les 30 derniers contextes quotidiens (niveau, mode, fournisseur et source) au rôle administrateur uniquement. Un administrateur de périmètre doit avoir la cible dans son périmètre ; une simple délégation `AdminPanelManage` ne suffit pas. La même règle protège `GET /users/:id/permission-logs`. Une session rétrogradée est refusée. Le diagnostic apparaît dans la modale de permissions, sans exposer l’empreinte interne de dédoublonnage.

## 2. Modèle d'autorisation à trois couches

L'autorisation combine **trois sources de permissions cumulatives**. La fusion et la décision sont centralisées dans `backend/src/common/service/check-permissions.service.ts`, méthode `can()`.

> **Permission effective = (permissions de rôle) ∪ (permissions individuelles) ∪ (permissions de type d'acteur sur cette application)**

```mermaid
flowchart TD
  R["Couche 1 — Rôle global\nroleToPermissions(user.role)\n→ user.permissions"]
  I["Couche 2 — Permissions individuelles\nUser.additionalPermissions"]
  A["Couche 3 — Type d'acteur sur l'app\ngetUserAppPermissions(applicationId, user)\n+ rôle projeté getUserRolePermissions"]
  U(("Union — Set\n.some(perm ∈ requises)"))
  R --> U
  I --> U
  A --> U
  U -->|au moins une permission requise présente| OK[Accès accordé]
  U -->|aucune| KO[403 Forbidden]
```

Extrait du cœur de décision (`check-permissions.service.ts:36-44`) :

```ts
const userPermissions = new Set([
  ...user.permissions,
  ...user.additionalPermissions,
  ...(user.appPerms ?? []),
]);
const hasPermissions = Array.from(userPermissions).some((userPermission) =>
  permissions.includes(userPermission),
);
return hasPermissions;
```

Points clés :

- Si aucune permission n'est requise (`!permissions?.length`), l'accès est **accordé** sans contrôle (`can():24`).
- La **couche 3 n'est calculée que si un `applicationId` est fourni** (`can():25-35`). Elle agrège deux sous-ensembles : les permissions d'acteur (`getUserAppPermissions`) et le rôle projeté sur l'application en tenant compte du scope (`getUserRolePermissions`), affectés à `user.appPerms`.
- La sémantique est un **OU logique** (`.some(...)`) : posséder une seule des permissions requises suffit.

### Couche 1 — Rôle global cumulatif

L'énumération `Roles` (`backend/prisma/schema/users.prisma:46-52`) est **hiérarchique et cumulative** :

`VISITOR < READER < CONTRIBUTOR < ADMIN`

Le mapping rôle → permissions est défini dans `backend/src/permissions/role-to-permissions.ts`, sous forme d'ensembles imbriqués : chaque niveau **étend** le précédent (`READ_PERMISSIONS` inclut `NONE_PERMISSIONS`, etc.). Les permissions de rôle sont calculées par `roleToPermissions(user.role)` et stockées dans `user.permissions` au moment de l'authentification.

### Couche 2 — Permissions individuelles

Le champ `User.additionalPermissions` (`backend/prisma/schema/users.prisma:41`, type `Permission[]`) permet d'accorder des permissions **supplémentaires** à un utilisateur précis, indépendamment de son rôle (anciennement nommé _capabilities_). Toute modification est **auditée** via `UserPermissionLog` (`backend/prisma/schema/user-log.prisma:2-10`), qui conserve `userId`, `changedById`, le `role` et les `additionalPermissions` au moment du changement, ainsi que `createdAt`.

Depuis #2498, cette couche est **bornée** : `UpdateUserDto` n'accepte que les permissions **déléguables** (`DELEGABLE_PERMISSIONS` dans `backend/src/permissions/role-to-permissions.ts` : `CreateApplication`, `CreateGlobalReport`, `DataExport`, `MDITList`, `QualityCampaignManage`, `MditCampaignManage`, soit la liste proposée par le panneau d'administration) — `AdminPanelManage`, `DeleteApplication` ou une permission applicative sont refusées (400). Depuis #2608, `QualityCampaignManage` et `MditCampaignManage` font exception au reste du socle Administrateur (`ADMIN_PERMISSIONS`) : elles **ne sont jamais accordées par le rôle**, y compris à un `ADMIN` global — elles doivent systématiquement transiter par cette couche 2, exactement comme pour un utilisateur délégué non-admin. En complément, l'**administration des utilisateurs** (édition des droits, blocage, impersonation, périmètre d'un compte de service) exige le **rôle** `ADMIN` et pas seulement la permission `AdminPanelManage` (`ScopedPermissionService.assertIsAdministrator`, `UserService.startImpersonation` #2505), et un administrateur ne peut pas modifier ses **propres** rôle, périmètre ou permissions déléguées. Côté jetons API, le plafonnement du rôle par le jeton s'applique aussi aux `additionalPermissions` du compte impersonné (#2504) : un jeton émis plus faible que son compte ne les porte pas.

### Couche 3 — Permissions par type d'acteur sur une application

Un utilisateur peut être déclaré **acteur** d'une application via son `ActorType` (MOA, MOE, RSSI, etc.). Il hérite alors de la matrice `AppPermissions` associée à ce type d'acteur, **uniquement pour l'application concernée**. La résolution se fait dans `getUserAppPermissions(applicationId, user)` (`check-permissions.service.ts:47-83`) selon **deux canaux** :

- **Canal email** : un `Actor` de l'application dont l'`email` est celui de l'utilisateur **sans tenir compte de la casse** (#2501 : e-mails d'acteurs et d'utilisateurs stockés en minuscules, comparaison `mode: "insensitive"`, migration de rattrapage `20260904090000_lowercase_emails`) et `isGroup = false` (`check-permissions.service.ts:51-55`).
- **Canal organisation de groupe** : si l'utilisateur a une organisation (`user.organization.path`), une requête SQL (`QueryBuilderGroupActor.buildByApplication`) retrouve les acteurs **de groupe** (`isGroup = true`) dont l'organisation est un **ancêtre** de celle de l'utilisateur, via une comparaison de chemins matérialisés : `lower('<path utilisateur>') LIKE lower(o.path) || '%'` (`backend/src/common/service/prisma-query-builder.service.ts`).

Pour chaque type d'acteur retenu, la matrice `AppPermissions` est convertie en liste de permissions par `transformAppPermissionsObjectToArray` (`backend/src/common/utils/types.ts:38-47`), qui ne conserve que les champs booléens à `true` correspondant à une valeur de l'énumération `Permission`.

S'ajoute à cette couche le **rôle projeté sur l'application** (`getUserRolePermissions`, `check-permissions.service.ts:85-126`) : sans scope, l'utilisateur dispose de toutes les permissions applicatives de son rôle (`roleToAppPermissions(user.role)`) ; avec un scope, ces permissions ne sont accordées que si l'application relève bien de ce périmètre (voir [section 6](#6-scope-administratif-périmètre-organisationnel)).

## 3. Rôles et mapping des permissions

Le tableau ci-dessous restitue les **permissions globales** attribuées à chaque rôle, telles que définies par les ensembles imbriqués de `role-to-permissions.ts` (`roleToPermissions`). L'héritage est **cumulatif** : chaque rôle possède tout ce que possède le rôle inférieur.

| Permission globale   | VISITOR | READER | CONTRIBUTOR | ADMIN |
| :------------------- | :-----: | :----: | :---------: | :---: |
| `AppRead`            |    ✓    |   ✓    |      ✓      |   ✓   |
| `AppList`            |    ✓    |   ✓    |      ✓      |   ✓   |
| `ReportRead`         |    ✓    |   ✓    |      ✓      |   ✓   |
| `ReportPost`         |    ✓    |   ✓    |      ✓      |   ✓   |
| `MDITList`           |         |   ✓    |      ✓      |   ✓   |
| `CreateApplication`  |         |        |      ✓      |   ✓   |
| `CreateGlobalReport` |         |        |      ✓      |   ✓   |
| `ReportManage`       |         |        |      ✓      |   ✓   |
| `OrganizationManage` |         |        |      ✓      |   ✓   |
| `ActorTypeManage`    |         |        |      ✓      |   ✓   |
| `ActorTypeDelete`    |         |        |      ✓      |   ✓   |
| `AdminPanelManage`   |         |        |             |   ✓   |
| `GlobalAdminManage`  |         |        |             |  ✓\*  |
| `DataExport`         |         |        |             |   ✓   |
| `DeleteApplication`  |         |        |             |   ✓   |
| `ActorTypePost`      |         |        |             |   ✓   |

\* `GlobalAdminManage` — et `QualityCampaignManage` — ne sont accordées qu'à un administrateur
**sans périmètre organisationnel** (#2446, `SCOPED_ADMIN_EXCLUDED_PERMISSIONS`). Un administrateur
de périmètre garde `AdminPanelManage`, qui ne lui ouvre plus que l'administration des utilisateurs
et des acteurs de son périmètre (cf. [section 6.4](#64-effet-sur-les-onglets-dadministration)).

Symétriquement, `roleToAppPermissions(role)` projette un rôle en **permissions applicatives** (utilisé par la couche 3 lorsqu'aucun scope ne restreint l'utilisateur) :

- **VISITOR** : aucune permission applicative (`[]`).
- **READER** : `ActorRead`, `ComplianceRead`, `HostingRead`, `RelationRead`, `LinkRead`, `MetadataRead`.
- **CONTRIBUTOR** : les lectures READER + `AppWrite`, `ActorWrite`, `ComplianceWrite`, `HostingWrite`, `RelationWrite`, `LinkWrite`, **et** `AppWritePriority`.
- **ADMIN** : identique à CONTRIBUTOR au niveau applicatif (`ADMIN_APP_PERMISSIONS = WRITE_APP_PERMISSIONS`).

> **Deux niveaux d'administration.** Le rôle `ADMIN` ci-dessus est le niveau _global_ (sans
> scope → droits de rôle sur **toutes** les applications) ou _de périmètre_ (avec `scopeOrganization` →
> sur les apps du périmètre, cf. [section 6](#6-scope-administratif-périmètre-organisationnel)). Les
> droits d'un acteur sur son application proviennent exclusivement de la matrice `AppPermissions`
> configurée pour son type d'acteur.

## 4. Catalogue de l'énumération Permission

L'énumération `Permission` (`backend/prisma/schema/permissions.prisma:59-105`) distingue les permissions **globales** (portée transverse) des permissions **applicatives** (portée par application). Les permissions applicatives suivent majoritairement un couple lecture/écriture.

### 4.1. Permissions globales

| Permission              | Rôle                                                                                                            |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `CreateApplication`     | Créer de nouvelles applications                                                                                 |
| `DeleteApplication`     | Supprimer une application                                                                                       |
| `CreateGlobalReport`    | Créer des signalements globaux                                                                                  |
| `MDITList`              | Voir la liste des applications sur le TIME / MDIT                                                               |
| `AppList`               | Voir la liste des applications                                                                                  |
| `DataExport`            | Exporter les données (export Excel)                                                                             |
| `AdminPanelManage`      | Administrer les utilisateurs et les acteurs (dans son périmètre s'il en a)                                      |
| `GlobalAdminManage`     | Administrer les réglages transverses — administrateur sans périmètre uniquement                                 |
| `ActorTypePost`         | Créer un type d'acteur                                                                                          |
| `ActorTypeManage`       | Éditer un type d'acteur                                                                                         |
| `ActorTypeDelete`       | Supprimer un type d'acteur                                                                                      |
| `OrganizationManage`    | Gérer les organisations (créer, modifier, supprimer)                                                            |
| `ColumnRead`            | Voir les colonnes de synthèse (socle Lecteur)                                                                   |
| `QualityCampaignManage` | Gérer les campagnes de mise en qualité (jamais par défaut, même pour un ADMIN global — déléguable, #2608)       |
| `MditCampaignManage`    | Gérer les campagnes de dette IT / millésimes (jamais par défaut, même pour un ADMIN global — déléguable, #2608) |

Quatre valeurs sont à la fois **globales** (socle Visiteur, cf. §3) et **applicatives** (colonnes de la matrice §4.2) : `AppRead`, `DataRead`, `ReportRead`, `ReportPost`. Comme le socle les accorde à tout utilisateur authentifié, leur colonne dans la matrice des types d'acteur est **sans effet** — la matrice ne les propose plus en retrait (#2510). Depuis #2506, `DeleteApplication` protège bien la route `DELETE /applications/:id` (auparavant `AdminPanelManage`).

### 4.2. Permissions applicatives (par application)

| Permission (lecture) | Permission (écriture) | Domaine                                                                                                                                                                             |
| :------------------- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppRead`            | `AppWrite`            | Informations de base de l'application                                                                                                                                               |
| `ActorRead`          | `ActorWrite`          | Acteurs                                                                                                                                                                             |
| `ComplianceRead`     | `ComplianceWrite`     | Conformités                                                                                                                                                                         |
| `HostingRead`        | `HostingWrite`        | Hébergement                                                                                                                                                                         |
| `RelationRead`       | `RelationWrite`       | Relations inter-applications                                                                                                                                                        |
| `LinkRead`           | `LinkWrite`           | Liens externes                                                                                                                                                                      |
| `MetadataRead`       | _(aucune)_            | Historique des métadonnées (généré automatiquement, pas d'écriture)                                                                                                                 |
| `DataRead`           | `DataWrite`           | Données de l'application (onglet Données) ; `DataWrite` est aussi une permission **globale** du socle Contributeur pour le catalogue partagé (descriptions, familles, sensibilités) |
| `TechnologyRead`     | `TechnologyWrite`     | Stack technique (onglet Technologies) ; `TechnologyRead` n'est **pas** au socle global (#2088)                                                                                      |

Permissions applicatives **autonomes** (sans couple lecture/écriture) et signalements :

| Permission         | Rôle                                                                         |
| :----------------- | :--------------------------------------------------------------------------- |
| `AppWritePriority` | Modifier la priorité de redémarrage (R0–R3). Lecture couverte par `AppRead`. |
| `ReportRead`       | Voir les signalements                                                        |
| `ReportPost`       | Créer des signalements sur une application                                   |
| `ReportManage`     | Gérer (modifier / supprimer) les signalements                                |

### 4.3. Cas particulier : `AppWritePriority` dissociée de `AppWrite`

La permission `AppWritePriority` gouverne la **priorité de redémarrage** (R0–R3) et est **dissociée** de `AppWrite` : elle peut être accordée séparément. Cette dissociation se lit à deux endroits :

- Dans le schéma, `AppWritePriority` est un booléen propre de `AppPermissions`, avec `@default(false)` (`permissions.prisma:11-12`).
- Au niveau d'un handler, les deux permissions sont acceptées en alternative (sémantique OU). Par exemple la mise à jour d'une application requiert `[Permission.AppWrite, Permission.AppWritePriority]` (`backend/src/applications/application.controller.ts:293`) : posséder l'une _ou_ l'autre suffit pour l'opération concernée.

### 4.4. Politique de lecture globale (état des lieux)

Certaines lectures ne sont conditionnées à **aucune** permission applicative, seulement à l'authentification : la liste des signalements d'une application, l'historique des modifications (`Metadata`) et la vue transverse des fins de vie (`GET /technologies/end-of-life`). C'est un choix historique (« tout utilisateur authentifié voit le catalogue »), pas une erreur d'implémentation ; sa remise à plat (restreindre, ou assumer et documenter) est tracée dans #2375 et #2509 et relève du métier. Tant qu'elle n'est pas tranchée, **ne pas** ajouter de nouvelle lecture globale sans la faire figurer ici.

## 5. Permissions par type d'acteur

La matrice `AppPermissions` (`backend/prisma/schema/permissions.prisma:5-52`) est en relation **1:1** avec `ActorType` (champ `actorTypeId @unique`, `onDelete: Cascade`). Chaque type d'acteur (MOA, MOE, RSSI, Architecte applicatif/technique, TMA, Exploitation, RSIMM, CPD, ProductOwner, ProductManager, Hébergement, Autre…) porte ainsi son propre jeu de booléens : `AppRead`, `AppWrite`, `AppWritePriority`, `ActorRead`/`ActorWrite`, `ComplianceRead`/`ComplianceWrite`, `HostingRead`/`HostingWrite`, `MetadataRead`, `RelationRead`/`RelationWrite`, `LinkRead`/`LinkWrite`, `ReportRead`/`ReportPost`/`ReportManage`.

Ces permissions ne s'appliquent **qu'à l'application** dont l'utilisateur est acteur, via les deux canaux décrits en [couche 3](#couche-3--permissions-par-type-dacteur-sur-une-application) :

- **Canal email** — l'utilisateur est directement nommé acteur de l'application (`Actor.email` égal à l'e-mail de l'utilisateur, insensible à la casse depuis #2501, `isGroup = false`).
- **Canal organisation de groupe** — l'utilisateur appartient (par chemin organisationnel) à une organisation déclarée **acteur de groupe** de l'application (`isGroup = true`).

> Pour la définition des entités `Actor`, `ActorType` et `Organization` (chemins matérialisés, codes d'acteur), se reporter au [Modèle de données](./04-modele-de-donnees.md).

## 6. Scope administratif (périmètre organisationnel)

Le champ `User.scopeOrganizationId` (`backend/prisma/schema/users.prisma:16-18`) restreint l'administration d'un utilisateur à une **branche de l'arbre organisationnel**. Le mécanisme s'appuie sur les **chemins matérialisés** (`Organization.path`).

### 6.1. Effet sur les permissions applicatives

Dans `getUserRolePermissions` (`check-permissions.service.ts:85-126`) :

- **Sans scope** (`scopeOrganization.path` absent) → l'utilisateur est traité comme administrateur global et obtient toutes les permissions applicatives de son rôle.
- **Avec scope** → les permissions de rôle ne sont projetées sur l'application que si celle-ci relève du périmètre, c'est-à-dire :
  - s'il existe un acteur de l'application dont l'organisation est **dans le périmètre**, **ou**
  - si l'application a une `businessDivision` dont l'une des organisations rattachées (`BusinessDivision.organizations`) est dans le périmètre (`hasBusinessDivisionScope`).
  - Sinon, **aucune** permission de rôle applicative n'est accordée (`return []`).

« Dans le périmètre » a une définition unique depuis #2370 (`organizationWithinScope`, `backend/src/common/utils/organization-scope.utils.ts`) : le `path` de l'organisation est **égal** au chemin de scope ou en est un **descendant à une frontière de segment** (`scope + "/"`), sans tenir compte de la casse. Un simple préfixe ne suffit pas (`/SG` ne couvre ni `/SGAMI` ni `/AUTRE/SG-BIS`), et un `contains` est proscrit.

### 6.2. Effet sur l'administration des utilisateurs

`ScopedPermissionService` (`backend/src/user/scope-permission/scoped-permission.service.ts`) applique le périmètre lors de la modification d'un utilisateur :

- Toute action d'administration d'un utilisateur (édition des droits, blocage, impersonation, périmètre d'un compte de service) exige le **rôle** `ADMIN` (`assertIsAdministrator`, #2498) : la permission `AdminPanelManage`, si elle avait été déléguée en base, ne suffit pas — un contributeur délégué sans périmètre se comportait auparavant en super-administrateur. Depuis #1985, ce même verrou refuse d'abord toute session **rétrogradée** (`authLevel.downgraded`, 403 `stepDown`), cf. [§1.4](#14-niveau-dauthentification--carte-agent-ou-double-authentification-1985).
- Un requestor `ADMIN` **sans scope** est super-administrateur : aucun contrôle de périmètre.
- Sinon, toute cible et toute organisation manipulée doivent être **dans le périmètre** au sens de §6.1 (`assertWithinScope` : égalité ou descendant à une frontière de segment). Une cible **sans organisation** n'est dans le périmètre de personne (#2371).
- Aucun verrou dédié n'interdit à un administrateur de modifier son **propre** rôle ou son **propre** périmètre : ces champs suivent exactement les mêmes règles que pour un tiers. Un admin global peut donc changer son propre rôle librement (`assertNoPrivilegeEscalation` ne bloque que la **promotion** vers `ADMIN` d'une cible qui ne l'est pas déjà). Un admin **scopé** qui retire son propre périmètre reste bloqué, mais pour la même raison que pour un tiers : `assertScopeOrganizationAction` réserve toute suppression de périmètre à un administrateur global. Pour `additionalPermissions` (#2608), bornées à la liste fermée `DELEGABLE_PERMISSIONS` et donc sans risque d'escalade, un **admin global** peut se les accorder ou se les retirer lui-même ; un admin **scopé** reste bloqué sur ce champ pour lui comme pour un tiers, `assertNoPrivilegeEscalation` réservant toute modification d'`additionalPermissions` à un administrateur global (#2371).
- Les permissions déléguables (couche 2) forment une liste fermée (`DELEGABLE_PERMISSIONS`, #2498) : `CreateApplication`, `CreateGlobalReport`, `DataExport`, `MDITList`, `QualityCampaignManage`, `MditCampaignManage`.
- Règle dédiée : **seul un administrateur global peut supprimer le périmètre d'un utilisateur** (`assertScopeOrganizationAction`, action `REMOVE` → exception), et seul un administrateur global peut attribuer le rôle `ADMIN`.

### 6.3. Effet sur l'impersonation

La même règle de périmètre s'applique à l'impersonation (#2217, `assertCanImpersonate`) : un admin scopé ne peut se faire passer que pour un utilisateur dont l'organisation est dans son périmètre ; un utilisateur **sans organisation n'est pas impersonnable** par un admin scopé (#2371), comme pour l'édition. Le rôle `ADMIN` est exigé (#2505), et le contrôle est appliqué à **deux niveaux** :

- `UserService.startImpersonation` (endpoint `POST /users/:id/impersonate`) ;
- `AuthMiddleware.resolveImpersonatedUser` — indispensable car c'est le middleware qui applique l'identité à chaque requête via le header `x-impersonate-user-id`, qui peut être posé sans passer par l'endpoint.

Côté interface, le bouton « Se connecter en tant que » n'est pas proposé hors périmètre (`UserActions.vue`, `canImpersonate`, alignée sur `canEditUser`).

En mode `enforce` du niveau d'authentification (#1985, [§1.4](#14-niveau-dauthentification--carte-agent-ou-double-authentification-1985)), l'impersonation exige en outre une **session forte** : le middleware refuse le header `x-impersonate-user-id` d'une session rétrogradée par un 403 `stepDown` et clôt la session `ImpersonationLog` ouverte.

### 6.4. Effet sur les onglets d'administration

Depuis #2446, le panneau d'administration distingue deux familles d'objets :

- ceux qui **se découpent par périmètre** — utilisateurs et acteurs — restent ouverts à
  `AdminPanelManage`, la liste comme les écritures étant filtrées par le périmètre du requêteur
  (`UserService.findAll` #2370, `ActorService.scopeFilter`/`assertWithinScope` #2446) ;
- ceux qui sont **transverses** — tags, sources, tokens, batchs (import Excel, synchronisations
  MAIA, recalcul de qualité), matrice des permissions, options d'hébergement, directions métier,
  journal des actions, historique des e-mails, historique global des modifications, revue
  datasteward — exigent `GlobalAdminManage`, que seul un administrateur **sans périmètre** possède.
  Aucune organisation ne les porte : aucun périmètre ne peut les découper.

Les **campagnes** (mise en qualité comme dette IT) suivent une logique à part, PAS via
`GlobalAdminManage` : chacune a sa propre capacité dédiée (`QualityCampaignManage`,
`MditCampaignManage`, #2608), délégable indépendamment (couche 2) à n'importe quel utilisateur —
administrateur de périmètre, administrateur global ou non-admin. Ni l'une ni l'autre n'est jamais
accordée par défaut, y compris à un administrateur global : « seuls les utilisateurs ayant accès à
la capacité gestion des campagnes peuvent gérer les campagnes ».

Côté interface, `AdminPage.vue` filtre chaque onglet sur ces mêmes permissions (défaut :
`GlobalAdminManage`) et masque toute tuile thématique dont aucun onglet n'est accessible — même
règle pour les trois tuiles, sans cas particulier : un administrateur de périmètre qui n'a ni
`QualityCampaignManage` ni `MditCampaignManage` ne voit pas la tuile « Campagnes », comme il ne
voit déjà pas la tuile « Gestion ». La description de la tuile n'énumère, sinon, que les onglets
réellement ouverts.

> **Limite connue.** Les routes `/organizations` (POST/PATCH/DELETE) restent gouvernées par
> `OrganizationManage`, portée par le socle **Contributeur** : l'onglet « Gestion des
> organisations » disparaît pour un administrateur de périmètre, mais la capacité elle-même n'est
> pas retirée — la revoir supposerait de la reprendre aussi pour les contributeurs.

## 7. Mise en œuvre côté code

### 7.1. Backend — garde et décorateur

La protection d'un endpoint repose sur deux éléments, posés **sur le handler** :

```ts
@UseGuards(PermissionGuard)
@RequiredPermissions([Permission.AppWrite, Permission.AppWritePriority])
```

- `@RequiredPermissions([...])` (`backend/src/common/decorators/required-permissions.decorator.ts`) attache les permissions requises en métadonnée.
- `PermissionGuard` (`backend/src/common/guards/permission.guard.ts`) lit cette métadonnée, récupère `request.user` (posé par l'`AuthMiddleware`) et le **paramètre de route `applicationId`**, puis délègue à `CheckPermissions.can(required, user, applicationId)`.

> **Contrainte importante.** Pour que la **couche 3** (permissions par application) soit prise en compte, le paramètre de route contextuel **doit s'appeler `applicationId`** : le guard lit exactement `request.params.applicationId` (`permission.guard.ts:28`). Un paramètre nommé autrement n'activera que les couches 1 et 2.

La sémantique reste **OU** : la liste passée à `@RequiredPermissions` représente des alternatives, l'accès est accordé dès qu'une seule est satisfaite.

### 7.2. Exposition au frontend — `my-perms`

Le frontend connaît les droits de l'utilisateur **sur une application** via `GET /applications/:applicationId/my-perms` (`backend/src/applications/application.controller.ts:149-172`). L'endpoint est lui-même protégé par `@RequiredPermissions([Permission.AppRead])` ; son handler résout **explicitement** les permissions applicatives (couche 3) via `CheckPermissions.resolveAppPermissions(applicationId, requestor)` (#2510) — le même point d'entrée que la garde, qui ne dépend plus d'un effet de bord (`requestor.appPerms`) du passage dans `PermissionGuard`.

### 7.3. Frontend — `userStore.hasPermissions`

Le contrôle d'affichage côté Vue est centralisé dans `frontend/src/stores/userStore.ts`. La fonction `hasPermissions(permissions, userApplicationPerms?)` reproduit fidèlement la logique backend (`userStore.ts:79-87`) :

```ts
const userPermissions = new Set([
  ...(user.value?.permissions ?? []),
  ...(user.value?.additionalPermissions ?? []),
  ...Array.from(userApplicationPerms ?? []),
]);
return Array.from(userPermissions).some((p) => permissions.includes(p));
```

Les composants passent en second argument les permissions applicatives obtenues via `my-perms` pour affiner l'affichage par application. Ce contrôle frontend est purement ergonomique : l'autorisation **réelle** est toujours appliquée côté backend par le `PermissionGuard`.

**Niveau d'authentification (#1985).** `GET /users/me` renvoie les permissions **effectives** de la session : `hasPermissions` n'a rien à savoir de la rétrogradation, le lien Admin, les gardes de route et les boutons suivent d'eux-mêmes. Le store expose en plus `authLevel` et `isAuthDowngraded` (calculé sur `downgraded`, jamais sur `level` — en mode `observe` le niveau peut être faible sans effet). Le bandeau `WeakAuthBanner.vue` (non sticky, non fermable, `role="status"`), la ligne « Niveau d'authentification » du profil, le badge « Droits limités » et l'onglet Tokens s'appuient dessus ; le bouton « Se reconnecter » appelle `signinStrong()` (`frontend/src/services/authentication.ts`) qui force `prompt=login` (et `acr_values` / `max_age` s'ils sont servis par `/config`) ; si cette tentative laisse la session faible, le bouton devient « Se déconnecter puis se reconnecter » et ferme complètement la session SSO avant une nouvelle connexion (stratégie `logout`, imposable d'emblée par `AUTH_LEVEL_REAUTH_STRATEGY`). **Le front n'est jamais source de vérité** : il ne lit ni `acr`, ni `amr`, ni le claim de mode dans le jeton (`user.profile` est un id token non validé par le backend), et les 403 typés `stepDown` sont traités par l'intercepteur (`init-clients.ts` : purge de l'impersonation et rechargement, ou message dédié).

> Pour le détail de l'architecture backend (modules, middleware, services), se reporter à [Architecture backend](./08-architecture-backend.md).

## 8. Bonnes pratiques de sécurité

- **Aucun secret en clair.** Les identifiants OIDC sont injectés par variables d'environnement obligatoires (`OIDC_JWKS_URL`, `OIDC_CONFIG_URL`, `OIDC_CLIENT_ID` — `oidc.config.ts`), et le frontend récupère sa configuration auprès du backend plutôt que de l'embarquer. La gestion des secrets passe par Vault et/ou SOPS, aucun secret en dur dans le dépôt — voir [Exploitation & déploiement](./12-exploitation-deploiement.md).
- **Désactivation de la vérification JWT réservée au local.** `DISABLE_JWT_VALIDATION` court-circuite la vérification de signature (`auth.middleware.ts:50-52`) et ne doit jamais être positionné hors développement.
- **Contexte HTTPS obligatoire.** Le flux OIDC navigateur exige TLS ; en HTTP, attendre des boucles 302 et des 401 intermittents.
- **Validation du jeton dans le backend.** La validation du JWT (signature via JWKS du fournisseur) est faite par l'`AuthMiddleware` du backend, seul garant de la vérification.
- **Validation stricte des entrées.** Les DTO NestJS (class-validator) et le typage Prisma encadrent les données ; conserver une validation stricte sur tout nouvel endpoint.
- **Audit.** Les changements de permissions (`UserPermissionLog`) et les connexions (`UserConnexionLog`) sont journalisés ; préserver ces traces. Depuis #2224, toute requête **mutante** est en outre journalisée dans `ActionLog` par l'`ActionLogMiddleware` (méthode, chemin, code de statut, identité effective) ; sous impersonation, l'**administrateur réel** est enregistré (`impersonatorId`) et l'action rattachée à sa session `ImpersonationLog` — on peut ainsi reconstituer tout ce qu'un admin a fait sous une identité empruntée. Les entrées `Metadata` créées sous impersonation portent elles aussi l'admin réel (`Metadata.impersonatorId`, #2226), affiché « via admin@x.fr » dans les historiques de modifications du front. Même principe pour les signalements (`Report.impersonatorId`, #2061) : renseigné automatiquement par l'extension Prisma `report-impersonator`, affiché « via admin@x.fr » dans les listes de signalements du front. `UserPermissionLog.impersonatorId` et le champ dénormalisé `User.lastPermissionChangedByImpersonatorId` (#2061, même absence de jointure explicite que `changedById`/`lastPermissionChangedById`) couvrent de la même façon les changements de droits — un cas réel : un admin peut impersonner un _autre_ admin puis modifier les droits d'un tiers, l'identité effective (l'admin impersonné) masquant sinon l'admin réel. Un nouveau module `ActionLogModule` (`GET /action-logs`, réservé `AdminPanelManage`) expose enfin ce journal générique dans le panneau d'administration (onglet « Journal des actions ») : c'est le seul historique qui couvre TOUTES les routes mutantes, y compris acteurs et utilisateurs, contrairement à `Metadata`/`Report` limités à leurs entités.
- **Respect du périmètre.** Toujours nommer `applicationId` le paramètre de route contextuel pour activer le contrôle par application, et respecter le scope organisationnel pour l'administration des utilisateurs.

---

### Récapitulatif des mécanismes confirmés

| Mécanisme                                                        | Emplacement vérifié                                                                                      |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| Fusion des 3 couches + décision OU (`Set` + `.some()`)           | `backend/src/common/service/check-permissions.service.ts:36-44`                                          |
| Calcul couche 3 conditionné à `applicationId`                    | `check-permissions.service.ts:25-35`                                                                     |
| Canaux email / organisation de groupe                            | `check-permissions.service.ts:47-83` + `backend/src/common/service/prisma-query-builder.service.ts`      |
| Rôle projeté + effet du scope sur l'app                          | `check-permissions.service.ts:85-126`                                                                    |
| Mapping rôle → permissions (cumulatif)                           | `backend/src/permissions/role-to-permissions.ts`                                                         |
| Enum `Roles` (VISITOR<READER<CONTRIBUTOR<ADMIN)                  | `backend/prisma/schema/users.prisma:46-52`                                                               |
| `User.additionalPermissions` + scope                             | `backend/prisma/schema/users.prisma:16-18,41`                                                            |
| Audit permissions / connexions                                   | `backend/prisma/schema/user-log.prisma:2-21`                                                             |
| Enum `Permission` (globales + applicatives)                      | `backend/prisma/schema/permissions.prisma:59-105`                                                        |
| Matrice `AppPermissions` (1:1 ActorType)                         | `backend/prisma/schema/permissions.prisma:5-52`                                                          |
| `AppWritePriority` dissociée (`@default(false)`, OU sur handler) | `permissions.prisma:11-12` + `application.controller.ts:293`                                             |
| Transformation matrice → permissions                             | `backend/src/common/utils/types.ts:38-47`                                                                |
| Garde + décorateur, param `applicationId`                        | `backend/src/common/guards/permission.guard.ts:28-29` + `required-permissions.decorator.ts`              |
| Endpoint `my-perms`                                              | `backend/src/applications/application.controller.ts:149-172` + `application.service.ts:267-269`          |
| Front `userStore.hasPermissions`                                 | `frontend/src/stores/userStore.ts:79-87`                                                                 |
| Auth backend (JWKS, modes token/JWT, pivot email)                | `backend/src/middlewares/auth.middleware.ts:37-68`                                                       |
| Niveau d'authentification : évaluation, rétrogradation, journal  | `backend/src/auth-level/`, `auth.middleware.ts`, `user-connexion-log.service.ts`, `auth-level.config.ts` |
| Couche 3 en lecture seule sous session faible                    | `check-permissions.service.ts` (`resolveAppPermissions`)                                                 |
| Refus typés `stepDown` (impersonation, jeton personnel, admin)   | `auth.middleware.ts`, `token.service.ts`, `scoped-permission.service.ts`, `step-down.exception.ts`       |
| Config OIDC obligatoire (générique, sans fournisseur en dur)     | `backend/src/config/configs/oidc.config.ts`                                                              |
| Front OIDC (oidc-client-ts, config dynamique)                    | `frontend/src/services/authentication.ts`                                                                |
| Scope administratif utilisateurs                                 | `backend/src/user/scope-permission/scoped-permission.service.ts`                                         |
