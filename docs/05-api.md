# API & intégration

Cette page décrit l'API REST du **Référentiel des Applications** (RefApp), exposée par le backend NestJS : conventions transverses (préfixe, format, validation, pagination), documentation interactive Swagger, authentification, inventaire des endpoints par module et variables d'environnement du backend. Elle complète l'[architecture générale](./02-architecture.md), les [permissions et la sécurité](./06-permissions-et-securite.md), l'[architecture backend](./08-architecture-backend.md) et l'[exploitation / déploiement](./12-exploitation-deploiement.md).

## Sommaire

- [Conventions générales](#conventions-générales)
- [Documentation interactive (Swagger)](#documentation-interactive-swagger)
- [Authentification de l'API](#authentification-de-lapi)
- [Inventaire des endpoints](#inventaire-des-endpoints)
- [Variables d'environnement](#variables-denvironnement)
- [Pour aller plus loin](#pour-aller-plus-loin)

## Conventions générales

### Préfixe global

Toutes les routes de l'API sont préfixées par **`/api/v2`**. Le préfixe est posé au démarrage dans `backend/src/main.ts` :

```ts
const globalPrefix = "/api/v2";
// …
app.setGlobalPrefix(globalPrefix);
```

Les chemins indiqués dans cette page sont relatifs à ce préfixe. Par exemple, le contrôleur `applications` expose en réalité `GET /api/v2/applications`.

### Format

L'API échange en **JSON** (UTF-8). Le backend applique `helmet()` et un CORS restreint aux origines déclarées dans `ALLOWED_ORIGINS` (liste CSV), avec `credentials: true` (`backend/src/main.ts`).

### Validation stricte

La validation globale est configurée dans `backend/src/config/app-config.ts` via un `ValidationPipe` NestJS :

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
});
```

Concrètement :

- `whitelist` retire silencieusement les propriétés non décorées dans le DTO ;
- `forbidNonWhitelisted` **rejette** (400) toute requête contenant une propriété inconnue ;
- `transform` instancie les DTO et convertit les types déclarés ; la conversion implicite est désactivée, les types de query/param doivent donc être explicitement déclarés.

### Pagination

Les grosses listes (catalogue d'environ 2 700 applications) **doivent** être paginées. La pagination est implémentée par une extension Prisma (`backend/src/prisma/extensions/pagination.extension.ts`) et renvoie systématiquement la forme :

```json
{
  "results": [
    /* … */
  ],
  "total": 0
}
```

Paramètres de requête associés :

| Paramètre  | Rôle                                                   | Défaut             |
| ---------- | ------------------------------------------------------ | ------------------ |
| `page`     | Index de page (base 0)                                 | `0`                |
| `pageSize` | Taille de page ; `0` ou absent désactive la pagination | `15` (plafond 100) |
| `sortBy`   | Champ de tri                                           | —                  |
| `order`    | Sens du tri (`asc` / `desc`)                           | —                  |

`GET /applications` accepte en outre des **filtres riches** de type ORM (par ex. `search`, `label`, `tag`, `actorType`, `actorEmail`, `organization`, `hostingSite`, `priorityRestart`, `missingMoa`, `missingMoe`, `missingHosting`, `myApplications`), avec suffixes `__in` / `__isNull` (par ex. `currentStatus__in`, `currentStatus__isNull`) et bornes de dates (`createdAtGte`, `createdAtLte`).

## Documentation interactive (Swagger)

La documentation OpenAPI est générée automatiquement à partir des contrôleurs et DTO décorés (`@nestjs/swagger`), dans `backend/src/swagger-config.ts`. Trois routes sont exposées (sous le préfixe global, donc `/api/v2/…`) :

| Route           | Contenu                                              |
| --------------- | ---------------------------------------------------- |
| `/swagger`      | Interface Swagger UI interactive (avec « explorer ») |
| `/swagger/json` | Document OpenAPI au format JSON                      |
| `/swagger/yaml` | Document OpenAPI au format YAML                      |

Métadonnées du document : titre « API Référentiel Applications », version « 2.0 ». Swagger UI est préconfiguré pour l'authentification OIDC (PKCE activé, `clientId` issu de la config, scopes `openid` et `profile`).

### Alimentation du client frontend

Lorsque l'option `writeYaml` est active (variable `WRITE_SWAGGER_YAML`, voir plus bas), le backend écrit le document dans `frontend/openapi/swagger.yaml`. Ce fichier sert de source unique au **client TypeScript généré** consommé par le frontend. La variable `ONLY_WRITE_SWAGGER` permet de générer le fichier puis d'arrêter le processus, ce qui est utilisé lors du build / de la régénération du client (script `gen` à la racine). Voir l'[architecture backend](./08-architecture-backend.md) et l'organisation frontend de l'[architecture générale](./02-architecture.md).

## Authentification de l'API

L'API ne possède **pas de route d'authentification dédiée** : l'authentification est déléguée à un fournisseur **OIDC standard (Authorization Code Flow), agnostique du fournisseur** (configuré via `OIDC_JWKS_URL` / `OIDC_CONFIG_URL` / `OIDC_CLIENT_ID`, voir `backend/src/config/configs/oidc.config.ts`) et appliquée par un middleware (`backend/src/middlewares/auth.middleware.ts`). En **développement**, le fournisseur OIDC est un **Keycloak local** ; en **production**, l'application s'interface avec le **fournisseur d'identité (SSO) de l'organisation** via ces mêmes variables. Deux schémas de sécurité sont déclarés globalement dans Swagger (`oauth2` puis `api_key`) :

- **JWT OIDC (Bearer)** — en-tête `Authorization: Bearer <JWT>` (flux C2B, utilisateur humain). Le jeton est vérifié **par le backend** contre le JWKS du fournisseur via `jose` (`createRemoteJWKSet` + `jwtVerify`), l'**email** servant d'identifiant pivot. En développement, `DISABLE_JWT_VALIDATION` décode le jeton **sans vérifier la signature** (à ne jamais activer en production).
- **Clé d'API / token de service ou personnel** — en-tête `x-refapp-token` (constante `API_KEY_HEADER`, `backend/src/utils/constants.util.ts`), utilisée pour les échanges **B2B** (machine à machine). Le jeton est résolu en utilisateur par le `TokenService`. Ce mécanisme couvre les jetons de service, les jetons personnels et l'impersonation (module `token`).

La matrice des permissions et le détail du contrôle d'accès sont décrits dans [Permissions & sécurité](./06-permissions-et-securite.md). On notera l'endpoint contextuel **`GET /applications/:applicationId/my-perms`**, qui renvoie les permissions de l'utilisateur courant sur une application donnée.

## Inventaire des endpoints

Inventaire **par module / ressource** (résumé : verbes et chemins principaux, pas exhaustif au paramètre près). Tous les chemins sont préfixés par `/api/v2`.

### Application & supervision

| Verbe & chemin      | Rôle                               |
| ------------------- | ---------------------------------- |
| `GET /`             | Message d'accueil                  |
| `GET /config`       | Configuration exposée au frontend  |
| `GET /health-check` | Santé, version et mode maintenance |

### Applications

| Verbe & chemin                                     | Rôle                                                   |
| -------------------------------------------------- | ------------------------------------------------------ |
| `POST /applications`                               | Créer une application                                  |
| `GET /applications`                                | Lister / rechercher (paginé, filtres riches)           |
| `GET /applications/count-by-month`                 | Comptage par mois                                      |
| `GET /applications/count-by-iq`                    | Comptage par indice qualité                            |
| `GET /applications/:applicationId/my-perms`        | Permissions de l'utilisateur courant sur l'application |
| `GET /applications/export/excel`                   | Export Excel (xlsx) — réservé admin                    |
| `GET /applications/data-quality/update`            | Recalcul global de l'indice qualité                    |
| `GET /applications/:applicationId`                 | Détail d'une application                               |
| `GET /applications/:applicationId/quality-summary` | Synthèse qualité                                       |
| `PATCH /applications/:applicationId`               | Mettre à jour                                          |
| `DELETE /applications/:applicationId`              | Supprimer                                              |

### Sous-ressources d'une application (`/applications/:applicationId/...`)

| Ressource             | Verbes principaux                                                |
| --------------------- | ---------------------------------------------------------------- |
| `actors`              | `POST`, `GET`, `GET :id`, `PATCH :id`, `DELETE :id`              |
| `metadatas`           | `GET`, `GET first-last`                                          |
| `statuses`            | `POST`, `GET`, `PATCH :statusId`, `DELETE :statusId`             |
| `relations`           | `POST`, `GET`, `GET graph`, `GET :id`, `PATCH :id`, `DELETE :id` |
| `compliances`         | `POST`, `GET`, `PATCH`, `POST ecoindex/scan`                     |
| `hostings`            | `POST`, `GET`, `GET :id`, `PATCH :id`, `DELETE :id`              |
| `labels`              | `POST`, `GET`, `PATCH :id`, `DELETE :id`                         |
| `links`               | `POST`, `GET`, `PATCH :id`, `DELETE :id`                         |
| `technical-debt-info` | `POST`, `GET`                                                    |
| `rgaa-compliances`    | `GET`, `POST`, `PATCH :id`, `DELETE :id`                         |
| `reports`             | `POST`, `GET`, `GET :id`, `PATCH :id`, `DELETE :id`              |

### Acteurs & types d'acteurs

| Verbe & chemin                                                                                                      | Rôle                                     |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `GET /actors/count`                                                                                                 | Comptage des acteurs                     |
| `POST /actorTypes` · `GET /actorTypes` · `GET /actorTypes/:id` · `PATCH /actorTypes/:id` · `DELETE /actorTypes/:id` | Gestion des types d'acteurs              |
| `GET /actorTypes/perms-matrix` · `PATCH /actorTypes/perms-matrix`                                                   | Matrice de permissions par type d'acteur |

### Conformités, hébergements & dette technique

| Verbe & chemin                                               | Rôle                              |
| ------------------------------------------------------------ | --------------------------------- |
| `GET /compliances/count`                                     | Comptage des conformités          |
| `GET /hostings/count`                                        | Comptage des hébergements         |
| `POST /hosting-options` · `GET` · `PATCH :id` · `DELETE :id` | Options d'hébergement             |
| `GET /sites`                                                 | Sites d'hébergement               |
| `GET /technical-debts`                                       | Dette technique (lecture globale) |

### Référentiels & catalogue de données

| Verbe & chemin                                                                        | Rôle                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------ |
| `POST /tags` · `GET /tags` · `GET /tags/:id` · `PATCH /tags/:id` · `DELETE /tags/:id` | Tags                                 |
| `POST /label-sources` · `GET` · `PATCH :id` · `DELETE :id`                            | Sources de labels                    |
| `GET /metadatas` · `GET /metadatas/:id`                                               | Métadonnées (lecture globale)        |
| `GET /business-division` · `GET :id` · `POST` · `PATCH :id` · `DELETE :id`            | Divisions métier (écritures admin)   |
| `GET /data-catalog/descriptions` (+ `POST`, `PATCH :id`, `DELETE :id`)                | Descriptions du catalogue de données |
| `GET /data-catalog/applications/:applicationId` · `.../:dataApplicationId`            | Données rattachées aux applications  |

### Organisations

| Verbe & chemin                                                         | Rôle                              |
| ---------------------------------------------------------------------- | --------------------------------- |
| `POST /organizations` · `GET` · `GET :id` · `PATCH :id` · `DELETE :id` | Organisations                     |
| `POST /organization-maia-references` · `GET` · `DELETE :id`            | Références MAIA des organisations |

### Statistiques & signalements

| Verbe & chemin                        | Rôle                                 |
| ------------------------------------- | ------------------------------------ |
| `GET /stats/iq-avg/period`            | Indice qualité moyen sur une période |
| `GET /reports` · `POST` · `PATCH :id` | Signalements globaux                 |

### Utilisateurs

| Verbe & chemin                                                                             | Rôle                                                             |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `GET /users/me` · `PATCH /users/me`                                                        | Profil de l'utilisateur courant                                  |
| `POST /users/me/subscribe/:appId` · `DELETE /users/me/subscribe/:appId`                    | Abonnement / désabonnement à une application                     |
| `POST /users/:id/sync-organization-from-maia` · `POST /users/sync-organizations-from-maia` | Synchronisation des organisations depuis MAIA (unitaire / batch) |
| `PATCH /users/:id`                                                                         | Mise à jour (dont permissions)                                   |
| `POST /users/:id/block` · `POST /users/:id/unblock`                                        | Bloquer / débloquer l'accès d'un utilisateur                     |
| `GET /users`                                                                               | Liste des utilisateurs                                           |

### Tokens (clés d'API)

| Verbe & chemin                                       | Rôle               |
| ---------------------------------------------------- | ------------------ |
| `GET /tokens` · `POST /tokens`                       | Jetons de service  |
| `GET /tokens/personal` · `POST /tokens/personal`     | Jetons personnels  |
| `POST /tokens/:id/regenerate`                        | Régénérer un jeton |
| `DELETE /tokens/:id` · `DELETE /tokens/personal/:id` | Révoquer un jeton  |

> Il n'existe **pas de route d'import** ; l'export se limite à `GET /applications/export/excel` (admin).

## Variables d'environnement

Variables lues par le **backend** (`backend/src/config/configs/*.ts`, `main.ts`, middleware d'authentification, outils MAIA). Conformément aux règles de sécurité, seuls le **nom** et le **rôle** sont indiqués, jamais de valeur sensible. Le détail du déploiement figure dans [Exploitation & déploiement](./12-exploitation-deploiement.md).

### Base de données

| Nom            | Rôle                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL` | URL de connexion PostgreSQL — **obligatoire** (échec au démarrage si absente). |

### OIDC (générique — Keycloak en dev, SSO de l'organisation en prod)

Ces variables pilotent un OIDC **agnostique du fournisseur** : Keycloak local en développement, fournisseur d'identité (SSO) de l'organisation en production.

| Nom                      | Rôle                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `OIDC_JWKS_URL`          | URL du JWKS pour valider les JWT — **obligatoire**.                            |
| `OIDC_CONFIG_URL`        | URL `.well-known/openid-configuration`, exposée au frontend — **obligatoire**. |
| `OIDC_CLIENT_ID`         | Identifiant du client OIDC, exposé au frontend — **obligatoire**.              |
| `DISABLE_JWT_VALIDATION` | Décode le JWT sans vérifier la signature (développement uniquement).           |

### Messagerie (SMTP)

| Nom            | Rôle                                                        |
| -------------- | ----------------------------------------------------------- |
| `SMTP_ENABLED` | Active l'envoi d'e-mails (avec `SMTP_HOST` et `SMTP_PORT`). |
| `SMTP_HOST`    | Hôte du serveur SMTP.                                       |
| `SMTP_PORT`    | Port du serveur SMTP.                                       |
| `SMTP_SECURE`  | Active TLS (`true` / `false`).                              |
| `SMTP_FROM`    | Adresse expéditrice.                                        |

### Application & exécution

| Nom                        | Rôle                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | Environnement d'exécution (`development` / `production`).                                 |
| `PORT`                     | Port d'écoute du backend.                                                                 |
| `HOST`                     | Adresse d'écoute du backend.                                                              |
| `ALLOWED_ORIGINS`          | Origines CORS autorisées (liste CSV), avec credentials.                                   |
| `LOG_LEVEL`                | Niveau de log Pino.                                                                       |
| `VERSION`                  | Version applicative exposée au frontend et au healthcheck.                                |
| `ENV_LABEL`                | Libellé d'environnement affiché côté frontend.                                            |
| `MAINTENANCE_MODE`         | Force le mode maintenance lecture seule (`true`, `1` ou `yes`).                           |
| `MAINTENANCE_CACHE_TTL_MS` | Durée de cache de la détection `pg_is_in_recovery()` en millisecondes (défaut : `30000`). |
| `FOOTER_LINKS`             | Liens de pied de page (JSON).                                                             |
| `NON_ACTOR_PERMISSIONS`    | Permissions accordées hors rôle d'acteur (liste CSV).                                     |
| `WRITE_SWAGGER_YAML`       | Écrit `frontend/openapi/swagger.yaml` (sauf si `false`).                                  |
| `ONLY_WRITE_SWAGGER`       | Génère le Swagger puis arrête le processus (build).                                       |

### MAIA (référentiel d'organisations)

| Nom                      | Rôle                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `MOCK_MAIA_SERVICE`      | Active le mock du service MAIA (développement).                   |
| `MOCK_MAIA_ORGANIZATION` | Organisation renvoyée par le mock.                                |
| `MAIA_API_URL`           | URL de l'API MAIA réelle — requise lorsque le mock est désactivé. |

> Le pilotage de la mesure d'audience **Matomo** est porté côté frontend (`VITE_RDA_MATOMO_URL`, `VITE_RDA_MATOMO_SITE_ID` / `VITE_MATOMO_*`) et non par le backend. Les variables des services tiers de développement (Keycloak local `KC_*`, `POSTGRES_*`, `PGADMIN_*`) sont décrites dans [Exploitation & déploiement](./12-exploitation-deploiement.md).

## Pour aller plus loin

- [Architecture générale](./02-architecture.md) — composants, monorepo, chaîne OIDC.
- [Architecture backend](./08-architecture-backend.md) — modules NestJS, génération du client.
- [Permissions & sécurité](./06-permissions-et-securite.md) — rôles, matrice de permissions, `my-perms`.
- [Exploitation & déploiement](./12-exploitation-deploiement.md) — topologie de prod, configuration d'environnement.
