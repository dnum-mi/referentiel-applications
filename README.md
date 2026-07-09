# Référentiel des applications

![Build Status](https://img.shields.io/github/actions/workflow/status/dnum-mi/referentiel-applications/main-ci.yml?branch=main)
![Licence](https://img.shields.io/github/license/dnum-mi/referentiel-applications)
![Issues](https://img.shields.io/github/issues/dnum-mi/referentiel-applications)
![Pull Requests](https://img.shields.io/github/issues-pr/dnum-mi/referentiel-applications)
![Contributeurs](https://img.shields.io/github/contributors/dnum-mi/referentiel-applications)
![Version](https://img.shields.io/github/v/tag/dnum-mi/referentiel-applications)

**RefApp** catalogue et gère les informations sur les applications utilisées au sein du
ministère de l'Intérieur. Son objectif : fournir un **point de vérité unique** pour
répertorier et gouverner les métadonnées de ces applications (statut, acteurs,
conformité, hébergement, données, dette technique…).

Monorepo : **backend NestJS + Prisma/PostgreSQL** et **frontend Vue 3 + DSFR**.

## 📚 Documentation

La documentation de référence se trouve dans le dossier **[`docs/`](./docs/README.md)** :

- [Présentation](./docs/01-presentation.md) — finalité, périmètre, glossaire
- [Architecture](./docs/02-architecture.md) — pile technique et composants
- [Installation & démarrage](./docs/03-demarrage.md) — prérequis, Docker, commandes
- [Modèle de données](./docs/04-modele-de-donnees.md) · [API](./docs/05-api.md) · [Permissions & sécurité](./docs/06-permissions-et-securite.md)
- [Fonctionnalités](./docs/07-fonctionnalites.md) · [Backend](./docs/08-architecture-backend.md) · [Frontend](./docs/09-architecture-frontend.md)
- [Accessibilité (RGAA)](./docs/10-accessibilite-rgaa.md) · [Contribuer](./docs/11-contribution.md) · [Exploitation & déploiement](./docs/12-exploitation-deploiement.md)

## 🚀 Démarrage rapide

Prérequis : [Docker](https://docs.docker.com/get-started/get-docker/) & Docker Compose,
[Git](https://git-scm.com/) (Node et pnpm pour le développement hors conteneur — voir la
documentation).

```bash
git clone https://github.com/dnum-mi/referentiel-applications.git
cd referentiel-applications
docker compose up
```

Services exposés en développement : frontend `5173`, backend `3500`, PostgreSQL `5432`,
Prisma Studio `5555`, Mailpit `8025`, Keycloak `8082`, pgAdmin `8081`.

➡️ Étapes détaillées (migrations, seed, génération du client API, accès administrateur) :
**[Installation & démarrage](./docs/03-demarrage.md)**.

## 🤝 Contribuer

Le projet suit les [Conventional Commits](https://www.conventionalcommits.org/) et
valide automatiquement commits et formatage. Workflow, tests et intégration continue
sont décrits dans le guide **[Contribuer](./docs/11-contribution.md)**.

## 📄 Licence

Ce projet est distribué sous licence **MIT**. Voir le fichier [LICENSE](./LICENSE).
