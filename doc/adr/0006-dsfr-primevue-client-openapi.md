# ADR-006 — Design system DSFR (+ PrimeVue) et client API généré depuis l'OpenAPI

## Statut

Accepté

## Date

2026-06-09

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

RefApp est une application de l'État : elle doit respecter le **Système de Design de l'État (DSFR)**.

Côté front (Vue 3), l'équipe avait besoin de composants conformes à la marque de l'État, mais aussi de **tableaux et de pagination** riches que le DSFR ne couvre pas pleinement.

Côté contrat d'API, le backend NestJS produit un **Swagger / OpenAPI**. Maintenir à la main un client HTTP côté front aurait été source d'écarts entre le contrat et son usage.

La décision à prendre porte donc sur deux points liés : quel(s) socle(s) de composants adopter pour un front conforme au DSFR mais capable d'afficher des tableaux paginés, et comment garantir l'alignement permanent entre le client d'API du front et le contrat OpenAPI du backend.

## Options Considérées

- Assurer la conformité visuelle à la marque de l'État (DSFR obligatoire pour une application de l'État).
- Disposer de composants riches de **tableaux et de pagination**, non pleinement couverts par le DSFR.
- Maintenir en permanence l'alignement entre le contrat OpenAPI du backend et le client HTTP du front.
- Éviter la maintenance manuelle, source d'écarts entre le contrat et son usage.

### Option 1 — DSFR seul, client d'API écrit et maintenu à la main

Cette option consiste à n'utiliser que le DSFR (via `vue-ds.fr`) pour l'ensemble du front et à coder à la main le client HTTP consommant l'API du backend.

Avantages :

- une seule bibliothèque de composants, cohérence visuelle immédiate avec la marque de l'État ;
- pas d'étape de génération de code à intégrer au build.

Inconvénients :

- le DSFR ne couvre pas pleinement les **tableaux et la pagination** nécessaires, ce qui impose du développement spécifique ;
- le client d'API maintenu à la main est source d'écarts entre le contrat OpenAPI et son usage.

### Option 2 — DSFR (`vue-ds.fr`) complété par PrimeVue et client d'API généré depuis l'OpenAPI

Cette option consiste à adopter le DSFR comme design system, à le compléter avec PrimeVue pour les tableaux et la pagination, et à générer le client d'API du front à partir de l'OpenAPI produit par le backend.

Avantages :

- conformité visuelle à la marque de l'État apportée par le DSFR ;
- composants de **tableaux et de pagination** robustes fournis par PrimeVue ;
- client d'API **régénérable**, donc toujours aligné sur le contrat backend.

Inconvénients :

- deux bibliothèques de composants (DSFR + PrimeVue) à harmoniser visuellement ;
- client généré à **régénérer** à chaque évolution du contrat OpenAPI.

## Décision

- Adopter **DSFR** via `vue-ds.fr` comme design system (composants `DsfrBadge`, `DsfrCallout`, etc.).
- Compléter avec **PrimeVue** pour les **tableaux et la pagination** (2026).
- **Générer le client API du front à partir de l'OpenAPI** produit par le backend (`swagger.yaml` partagé), via le script `gen` de la racine du monorepo.

## Conséquences

- Avantages

* Conformité visuelle à l'État.
* Composants de tableau robustes.
* Client API toujours aligné sur le contrat backend (régénérable).

- Inconvénients

* Double bibliothèque de composants (DSFR + PrimeVue) à harmoniser visuellement.
* Le client généré doit être **régénéré** à chaque évolution du contrat OpenAPI.
* La **pagination devient obligatoire partout** (pageSize ~5000), règle adoptée après le crash lié à l'affichage de ~15 000 applications sans pagination.

## Liens et Références

- [Architecture frontend](../../docs/09-architecture-frontend.md)
- [API](../../docs/05-api.md)
- Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
