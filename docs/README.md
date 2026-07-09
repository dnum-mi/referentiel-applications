# Documentation — Référentiel des Applications (RefApp)

Documentation de référence du **Référentiel des Applications** (RefApp), le catalogue
centralisé des applications du ministère de l'Intérieur porté par la DNUM-MI.

Cette documentation est rédigée en français et s'appuie sur le code du dépôt. Elle vise
deux usages : **prise en main** (installation, architecture) et **référence**
(modèle de données, API, permissions, exploitation).

## Sommaire

| #   | Page                                                           | Contenu                                                                   |
| :-- | :------------------------------------------------------------- | :------------------------------------------------------------------------ |
| 01  | [Présentation](./01-presentation.md)                           | Finalité, utilisateurs cibles, périmètre, positionnement, glossaire       |
| 02  | [Architecture](./02-architecture.md)                           | Monorepo, pile technique, diagramme de composants, authentification       |
| 03  | [Installation & démarrage](./03-demarrage.md)                  | Prérequis, stack Docker, ports, commandes, accès administrateur           |
| 04  | [Modèle de données](./04-modele-de-donnees.md)                 | ERD, entités par domaine, entité centrale `Application`, audit            |
| 05  | [API & intégration](./05-api.md)                               | Conventions `/api/v2`, Swagger, inventaire des endpoints, variables d'env |
| 06  | [Permissions & sécurité](./06-permissions-et-securite.md)      | Authentification OIDC, modèle d'autorisation à 3 couches, rôles           |
| 07  | [Fonctionnalités produit](./07-fonctionnalites.md)             | Catalogue, fiche application, IQ, signalements, tableaux de bord          |
| 08  | [Architecture backend](./08-architecture-backend.md)           | NestJS, `BaseService`, Prisma, conventions, DTO, CLI                      |
| 09  | [Architecture frontend](./09-architecture-frontend.md)         | Vue 3, stores Pinia, client API généré, routage, DSFR + PrimeVue          |
| 10  | [Accessibilité (RGAA)](./10-accessibilite-rgaa.md)             | Cadre RGAA, suivi RGAA dans le produit, démarche a11y et tests            |
| 11  | [Contribuer](./11-contribution.md)                             | Workflow Git, commits conventionnels, tests, intégration continue         |
| 12  | [Exploitation & déploiement](./12-exploitation-deploiement.md) | Topologie, images Docker, CI/CD, configuration, secrets, observabilité    |

### Décisions d'architecture (ADR)

Les choix structurants sont consignés sous [`doc/adr/`](../doc/adr/README.md)
(Architecture Decision Records).

## Conventions de cette documentation

- **Fidélité au code** : les affirmations renvoient autant que possible aux fichiers du
  dépôt (`chemin:ligne`). En cas d'évolution du code, mettre la documentation à jour.
- **Éléments à venir** : ce qui n'est pas encore implémenté est explicitement marqué
  _« prévu »_.
- **Schémas** : les diagrammes sont en [Mermaid](https://mermaid.js.org/) ; les rendus
  d'ERD sont dans [`assets/`](./assets/).
