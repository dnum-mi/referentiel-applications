# ADR-003 — Architecture monorepo NestJS + Vue 3 (réécriture de CANEL)

## Statut

Accepté

## Date

2026-06-09

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

RefApp est la **réécriture d'un service historique** (« CANEL »). Au démarrage, le front (Vue) et le back (NestJS) vivaient dans deux dépôts distincts.

Pendant cette refonte de grande ampleur, l'équipe avait besoin de **lisibilité** et de **cohérence** entre front et back (types partagés, OpenAPI, CI commune), sans multiplier les dépôts à synchroniser.

La question était donc de déterminer comment organiser les dépôts front et back pour soutenir cette refonte : conserver deux dépôts séparés ou réunir les deux applications au sein d'un même dépôt.

## Options Considérées

Critères de décision :

- Assurer la lisibilité et la cohérence entre front et back (types partagés, OpenAPI, CI commune).
- Limiter le nombre de dépôts à cloner et à synchroniser pendant la refonte.
- Favoriser la clarté pendant une refonte de grande ampleur.
- Maîtriser le versionnement et la chaîne de build.

### Option 1 — Conserver deux dépôts distincts (statu quo)

Conserver la situation de départ : le front (Vue) et le back (NestJS) restent dans deux dépôts séparés.

Avantages :

- séparation nette des deux applications et de leurs cycles de vie ;
- aucun renommage ni réorganisation de répertoires à mener.

Inconvénients :

- deux dépôts à cloner et à synchroniser en permanence ;
- partage plus difficile des types, de l'OpenAPI et des conventions ;
- CI à maintenir séparément pour chaque dépôt.

### Option 2 — Fusionner front et back dans un mono-dépôt

Réunir les deux applications côte à côte dans un seul dépôt : `backend/` (NestJS + Prisma) et `frontend/` (Vue 3), avec un `package.json` par application et une racine portant l'outillage transverse.

Avantages :

- un seul dépôt à cloner et à versionner ;
- CI unifiée ;
- partage facilité de l'OpenAPI et des conventions ;
- lisibilité et cohérence renforcées pendant la refonte.

Inconvénients :

- le renommage `server`/`client` → `backend`/`frontend` casse le build existant ;
- risque de désynchronisation du versionnement front/back (`release-please`).

### Option 3 — Tout regrouper dans le dépôt back existant

Plutôt que de constituer un nouveau mono-dépôt, réutiliser le dépôt back actuel pour y accueillir également le front (« on aurait pu tout mettre sur le back actuel »).

Avantages :

- réutilisation directe du dépôt back existant ;
- dépôt unique, comme le mono-dépôt.

Inconvénients :

- structure moins claire entre les deux applications côte à côte ;
- réorganisation du dépôt back existant néanmoins nécessaire.

## Décision

- **Fusionner front et back dans un mono-dépôt**, avec deux applications côte à côte :
  - `backend/` — API **NestJS** + **Prisma** (PostgreSQL) ;
  - `frontend/` — SPA **Vue 3** (Vite, Pinia).
- **Renommer** les répertoires `server`/`client` → `backend`/`frontend`.
- Conserver un **`package.json` par application** (pas de workspaces pnpm formels) ; la racine ne porte que l'outillage transverse (ESLint, Prettier, Husky, commitlint, génération du client API).

Le mono-repo a été choisi « pour la clarté pendant la grosse refacto », tout en assumant qu'« on aurait pu tout mettre sur le back actuel ».

## Conséquences

- Avantages

* Un seul dépôt à cloner et à versionner.
* CI unifiée.
* Partage facilité de l'OpenAPI et des conventions.
* Le dépôt GitHub est miroité vers la plateforme de déploiement de l'organisation pour le build d'image et le déploiement.

- Inconvénients

* Le renommage `server`/`client` → `backend`/`frontend` a cassé le build GitLab (`DOCKERFILE: ./server/Dockerfile`).
* Ce même renommage a perturbé `release-please` (versions front/back désynchronisées).

## Liens et Références

- [Architecture](../../docs/02-architecture.md)
- Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
