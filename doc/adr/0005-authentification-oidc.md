# ADR-005 — Authentification OIDC (Keycloak en dev, SSO de l'organisation en prod)

## Statut

Accepté

## Date

2026-06-10

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

Le référentiel des applications doit disposer d'un mécanisme d'authentification robuste, sans jamais exposer de secret dans le code : la gestion des secrets passe par Vault et/ou SOPS.

Un choix de flux OIDC s'imposait. L'**Authorization Code Flow + PKCE** a été retenu comme cible. Par ailleurs, les librairies OIDC côté navigateur (`oidc-client-ts`) exigent un **contexte sécurisé (HTTPS)**, ce qui est source de bugs lorsque l'application est servie en HTTP (boucles 302, erreurs CORS, 401 intermittents).

La décision à prendre consiste donc à définir la stratégie d'authentification : le flux OIDC, le degré de couplage à un fournisseur d'identité donné, le lieu de validation des jetons et le modèle interne de gestion des utilisateurs.

## Options Considérées

Critères de décision :

- Ne stocker aucun secret en dur dans le code (gestion via Vault et/ou SOPS).
- Rester indépendant d'un fournisseur d'identité particulier (solution agnostique, potentiellement multi-provider OIDC).
- Assurer une validation robuste des jetons d'accès.
- Conserver la maîtrise interne des utilisateurs, des permissions custom et de la traçabilité.

### Option 1 — OIDC générique agnostique du fournisseur, avec table `User` interne

Mettre en place un OIDC standard en Authorization Code Flow, piloté par variables d'environnement (`OIDC_JWKS_URL`, `OIDC_CONFIG_URL`, `OIDC_CLIENT_ID`), avec un Keycloak local en développement et le SSO de l'organisation en production. Les jetons JWT sont validés dans le backend et une table `User` interne est conservée, l'utilisateur étant créé à la première connexion.

Avantages :

- aucun secret en dur, aucun fournisseur codé en dur ;
- flux OIDC standard, réutilisable avec n'importe quel fournisseur conforme ;
- possibilité de multi-provider OIDC et découplage vis-à-vis du fournisseur d'identité ;
- permissions custom et traçabilité (`createdBy`/`dataOwner`) grâce au modèle `User` interne ;
- même configuration en développement (Keycloak) et en production (SSO de l'organisation) via les mêmes variables.

Inconvénients :

- exigence du contexte HTTPS, contraignante en développement ;
- validation des jetons JWT à implémenter et à maintenir dans le backend ;
- nécessité de faire tourner un Keycloak local en développement.

### Option 2 — Coder en dur un fournisseur d'identité spécifique

Intégrer directement un fournisseur d'identité particulier (par exemple Keycloak) sans couche d'abstraction pilotée par variables d'environnement.

Avantages :

- intégration plus directe, avec moins d'abstraction à concevoir.

Inconvénients :

- couplage fort à un fournisseur unique ;
- pas de support multi-provider OIDC ;
- passage du fournisseur de développement à celui de production plus difficile.

### Option 3 — Déléguer entièrement l'identité et les utilisateurs au fournisseur

Ne pas conserver de table `User` interne et déléguer intégralement la gestion des utilisateurs au fournisseur OIDC.

Avantages :

- moins de code à maintenir, pas de gestion d'utilisateurs en interne.

Inconvénients :

- dépendance forte au fournisseur d'identité ;
- impossibilité de gérer des permissions custom ;
- perte de la traçabilité interne (`createdBy`/`dataOwner`) ;
- pas de multi-provider OIDC.

## Décision

- Mettre en place un **OIDC standard, agnostique du fournisseur**, en **Authorization Code Flow**, piloté par variables d'environnement (`OIDC_JWKS_URL`, `OIDC_CONFIG_URL`, `OIDC_CLIENT_ID`). Aucun fournisseur n'est codé en dur. **En développement**, le fournisseur OIDC est un **Keycloak local** (realm `referentiel-applications` fourni dans `keycloak/`) ; **en production**, l'application s'interface avec le **fournisseur d'identité (SSO) de l'organisation** via ces mêmes variables.
- Assurer la **validation des jetons JWT dans le backend** (`backend/src/middlewares/auth.middleware.ts`), par vérification de signature via le JWKS du fournisseur.
- Conserver une **table `User`** interne plutôt que de tout déléguer au fournisseur : indépendance vis-à-vis du fournisseur, multi-provider OIDC, permissions custom, traçabilité (`createdBy`/`dataOwner`). L'utilisateur est créé **à la première connexion**.
- Exiger le **contexte HTTPS** pour le front en environnement déployé.
- Distinguer **C2B** (utilisateur humain, `Authorization: Bearer <JWT>`) et **B2B** (machine à machine, jeton via l'en-tête `x-refapp-token`).

## Conséquences

- Avantages

* Aucun secret n'est stocké en dur dans le code.
* Le flux OIDC est standard et générique, réutilisable avec tout fournisseur conforme.
* Le modèle `User` reste découplé du fournisseur d'identité (indépendance, multi-provider, permissions custom, traçabilité).
* La validation des jetons JWT est assurée de manière centralisée dans le backend (middleware d'authentification `backend/src/middlewares/auth.middleware.ts`).
* En production, l'application s'interface avec le fournisseur d'identité (SSO) de l'organisation via les variables OIDC, Keycloak restant le fournisseur OIDC de développement.
* L'**email** est l'identifiant pivot des utilisateurs (`email @unique` dans `backend/prisma/schema/users.prisma`, plus de champ `keycloakId`), l'`id` UUID interne restant la clé de liaison.

- Inconvénients

* L'exigence du contexte HTTPS est contraignante en développement.

## Liens et Références

- [Permissions et sécurité](../../docs/06-permissions-et-securite.md)
- [Architecture](../../docs/02-architecture.md)
- Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
