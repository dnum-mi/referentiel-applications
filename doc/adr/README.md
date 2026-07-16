# Décisions d'architecture (ADR)

Ce dossier regroupe les **ADR** (_Architecture Decision Records_) du **Référentiel des Applications (RefApp)**, le service de la DNUM-MI destiné à cataloguer et gérer les métadonnées des applications du ministère de l'Intérieur.

## Qu'est-ce qu'un ADR ?

Un **ADR** est une fiche courte qui consigne une **décision d'architecture structurante** : le contexte qui l'a motivée, les options considérées, le choix retenu et les conséquences (positives comme négatives). L'objectif est de garder une **trace historique** des décisions, de comprendre _pourquoi_ le projet est tel qu'il est aujourd'hui, et d'éviter de rejouer les mêmes débats.

Un ADR est **immuable** : une fois accepté, il n'est pas réécrit. Si une décision est remise en cause, on crée un **nouvel** ADR qui la remplace (et on bascule l'ancien en statut `Remplacé`).

## Convention

- Un fichier par décision, nommé `NNNN-titre.md` (numéro séquentiel sur quatre chiffres, titre en _kebab-case_).
- Chaque fiche suit la structure : **Statut**, **Date**, **Participants**, **Contexte et Problème**, **Options Considérées**, **Décision**, **Conséquences**, **Liens et Références**.
- Statuts possibles : `Proposé`, `Accepté`, `Remplacé`, `Abandonné`.

## Index des ADR

| N°   | Titre                                                                                                           | Statut  |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------- |
| 0001 | [Enregistrer les décisions d'architecture](./0001-record-architecture-decisions.md) _(socle ADR partagé)_       | Accepté |
| 0002 | [Utiliser Apache Superset pour la datavisualisation](./0002-dataviz-superset.md) _(socle ADR partagé)_          | Accepté |
| 0003 | [Architecture monorepo NestJS + Vue 3 (réécriture de CANEL)](./0003-monorepo-nestjs-vue.md)                     | Accepté |
| 0004 | [Migrations Prisma maîtrisées et SQL manuel pour les cas non couverts](./0004-migrations-prisma-sql-manuel.md)  | Accepté |
| 0005 | [Authentification OIDC (Keycloak en dev, SSO de l'organisation en prod)](./0005-authentification-oidc.md)       | Accepté |
| 0006 | [Design system DSFR (+ PrimeVue) et client API généré depuis l'OpenAPI](./0006-dsfr-primevue-client-openapi.md) | Accepté |
| 0007 | [Modèle de permissions à trois couches et secrets hors du code](./0007-permissions-trois-couches-secrets.md)    | Accepté |

> Les ADR **0001** et **0002** constituent le **socle ADR partagé** (`record-architecture-decisions`, d'après [adr-tools](https://github.com/npryce/adr-tools), et `dataviz-superset`) : ils posent la démarche ADR et le choix de datavisualisation, en amont des décisions propres au RefApp (à partir de 0003).

## Voir aussi

- [Sommaire de la documentation](../../docs/README.md)
- [Architecture](../../docs/02-architecture.md)
- [Permissions et sécurité](../../docs/06-permissions-et-securite.md)
