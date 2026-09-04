# Installation & démarrage

> Mise en route de l'environnement de développement local du **Référentiel des applications** (RefApp) : prérequis, démarrage de la stack Docker, configuration du backend et du frontend, accès administrateur et commandes utiles.

Cette page décrit l'installation complète en local. La stack repose sur **Docker Compose** : la plupart des commandes s'exécutent à l'intérieur des conteneurs, sans installation locale de Node ni de PostgreSQL. Une installation Node locale reste utile pour l'outillage (lint, exécution ponctuelle de scripts).

## Sommaire

- [1. Prérequis](#1-prérequis)
- [2. Cloner le dépôt](#2-cloner-le-dépôt)
- [3. Démarrer la stack Docker](#3-démarrer-la-stack-docker)
- [4. Configuration du backend](#4-configuration-du-backend)
- [5. Configuration du frontend](#5-configuration-du-frontend)
- [6. Accès administrateur en mode développement](#6-accès-administrateur-en-mode-développement)
- [7. Commandes utiles](#7-commandes-utiles)
- [8. Avant de considérer une tâche finie](#8-avant-de-considérer-une-tâche-finie)

## 1. Prérequis

| Outil                           | Version / remarque                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Git**                         | Pour cloner le dépôt.                                                                                                                                                            |
| **Docker** + **Docker Compose** | Indispensable : toute la stack de développement (backend, frontend, base de données, Keycloak, etc.) tourne en conteneurs.                                                       |
| **Node.js**                     | `>= 20.19.0` (champ `engines` des `package.json` ; le dépôt ne fournit pas de `.nvmrc`). Utile pour l'outillage local (lint, scripts). Gérez la version avec **fnm** ou **nvm**. |
| **pnpm**                        | **10.14** (champ `packageManager` : `pnpm@10.14.0`). Respectez le lockfile (`pnpm-lock.yaml`) : utilisez exclusivement pnpm, pas npm ni yarn.                                    |

> Sur **macOS (Apple Silicon)**, un runtime de conteneurs léger comme **Colima** convient parfaitement à la place de Docker Desktop. La commande `docker compose` reste identique.

## 2. Cloner le dépôt

```bash
git clone https://github.com/dnum-mi/referentiel-applications.git
cd referentiel-applications
```

## 3. Démarrer la stack Docker

Lancez l'ensemble des services. L'option `--build` (re)construit les images applicatives au besoin ; vous pouvez l'omettre lors des démarrages suivants.

```bash
docker compose up --build
```

Au premier démarrage, les conteneurs `backend` et `client` installent leurs dépendances et lancent le mode watch. La stack expose les ports suivants (vérifiés dans `docker-compose.yml`) :

| Service                        | URL / port (hôte)       | Rôle                                                                         |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| **client** (frontend Vue/Vite) | <http://localhost:5173> | Interface utilisateur (SPA).                                                 |
| **backend** (API NestJS)       | <http://localhost:3500> | API REST (préfixe global `/api/v2`).                                         |
| **postgres**                   | `localhost:5432`        | Base de données PostgreSQL.                                                  |
| **prisma-studio**              | <http://localhost:5555> | Explorateur de la base de données Prisma.                                    |
| **mailpit** (SMTP)             | `localhost:1025`        | Serveur SMTP de capture des e-mails.                                         |
| **mailpit** (web)              | <http://localhost:8025> | Interface web de consultation des e-mails.                                   |
| **keycloak**                   | <http://localhost:8082> | Fournisseur d'identité OIDC (realm `referentiel-applications`).              |
| **pgadmin**                    | <http://localhost:8081> | Administration PostgreSQL (compte par défaut : `admin@admin.com` / `admin`). |

> Le démarrage de **Keycloak** peut prendre quelques dizaines de secondes (import du realm + healthcheck) ; le backend en dépend pour la validation des jetons OIDC.

## 4. Configuration du backend

### Variables d'environnement

En développement, les variables nécessaires au backend sont **déjà fournies** par le service `backend` de `docker-compose.yml` ; aucune action n'est requise pour démarrer. Les principales catégories de variables sont :

- **Base de données** : `DATABASE_URL` (chaîne de connexion PostgreSQL).
- **Authentification OIDC** : `OIDC_CONFIG_URL`, `OIDC_JWKS_URL`, `OIDC_CLIENT_ID`.
- **CORS / réseau** : `ALLOWED_ORIGINS`, `PORT`, `HOST`.
- **Messagerie (SMTP)** : `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_ENABLED` (pointés vers Mailpit en local) ; `EMAIL_CRON_ENABLED` active les envois automatiques (digest quotidien, relances de validation), désactivés par défaut.
- **Détection des corrélations** : `CORRELATION_CRON_ENABLED` active le job planifié qui rapproche les applications proches (désactivé par défaut) ; `CORRELATION_SCORE_THRESHOLD` et les trois `CORRELATION_WEIGHT_*` règlent le seuil et la pondération des signaux.
- **Maintenance** : `MAINTENANCE_MODE` force le mode lecture seule ; `MAINTENANCE_CACHE_TTL_MS` règle la durée de cache de la détection PostgreSQL.
- **Divers** : `LOG_LEVEL`, `ENV_LABEL`, `FOOTER_LINKS`, `MOCK_MAIA_SERVICE`, `MOCK_MAIA_ORGANIZATION`.

> Aucune valeur secrète n'est requise en développement (les identifiants par défaut sont ceux du `docker-compose.yml`). Le détail des variables, leur signification et leur gestion en environnement déployé (Vault/SOPS) relèvent de la page d'exploitation.

### Préparer la base de données

Une fois la stack démarrée, exécutez ces commandes (depuis un autre terminal) pour générer le client Prisma, appliquer les migrations et alimenter la base.

```bash
# Générer le client Prisma (après toute modification du schéma)
docker compose exec backend pnpm db:generate

# Appliquer les migrations existantes
docker compose exec backend pnpm db:deploy

# Alimenter la base avec un jeu de données de démonstration
docker compose exec backend pnpm db:seed
```

Pour **créer une nouvelle migration** pendant le développement (après modification de `schema.prisma`), utilisez plutôt :

```bash
docker compose exec backend pnpm db:dev
```

> Toujours passer par `pnpm db:dev` (`prisma migrate dev`) pour produire une vraie migration versionnée — jamais `db push`. Les contraintes `CHECK` et les migrations de données doivent être écrites en SQL manuel.

Pour un jeu de données volumineux (test de charge) :

```bash
docker compose exec backend pnpm db:seed -- --environment stress
```

## 5. Configuration du frontend

Le service `client` lance automatiquement `pnpm dev` (Vite) au démarrage de la stack ; le frontend est accessible sur <http://localhost:5173>.

### Génération du client API

Le frontend consomme un client TypeScript généré à partir de la spécification OpenAPI du backend (`openapi/swagger.yaml`). **Ne modifiez jamais** les fichiers générés sous `src/client/**` ; régénérez-les après toute évolution de l'API :

```bash
# Régénère le client API côté frontend uniquement
docker compose exec client pnpm gen
```

Pour régénérer **à la fois** le contrat backend (swagger) et le client frontend, un raccourci existe à la racine du dépôt :

```bash
pnpm gen
```

Cette commande racine exécute `pnpm gen` dans le backend (mise à jour du swagger) puis dans le client (régénération du client API).

### Variables d'environnement frontend

Les variables Vite (préfixe `VITE_`) sont fournies par le service `client` (`docker-compose.yml`) et le fichier `.env.development`, notamment la configuration Matomo (`VITE_RDA_MATOMO_URL`, `VITE_RDA_MATOMO_SITE_ID`). Aucune action n'est requise pour démarrer en local.

## 6. Accès administrateur en mode développement

Deux méthodes permettent d'obtenir un compte administrateur en local.

### Méthode 1 — CLI backend (recommandée)

Le backend expose une CLI (`pnpm cmd`, basée sur Commander) permettant de créer ou de promouvoir un utilisateur. La commande effectue un _upsert_ sur l'e-mail :

```bash
docker compose exec backend pnpm cmd user create -e <email> -a ADMIN
```

- `-e, --email <email>` : adresse e-mail de l'utilisateur (obligatoire).
- `-a, --admin-level <level>` : rôle à attribuer (obligatoire). Valeurs attendues issues de l'énumération des rôles : `ADMIN`, `CONTRIBUTOR`, `READER`, `VISITOR`.

Exemple :

```bash
docker compose exec backend pnpm cmd user create -e admin@example.com -a ADMIN
```

> Inutile si vous avez exécuté `pnpm db:seed`, qui crée déjà des comptes de démonstration.

### Méthode 2 — Prisma Studio

1. Ouvrez **Prisma Studio** sur <http://localhost:5555>.
2. Localisez l'utilisateur à modifier dans la table dédiée.
3. Ajustez son champ de rôle pour lui attribuer les droits administrateur.

## 7. Commandes utiles

### Suivi des logs

```bash
# Tous les services
docker compose logs -f

# Un service précis (ex. backend)
docker compose logs -f backend
```

### Arrêter l'environnement

```bash
# Arrêter et supprimer les conteneurs
docker compose down
```

### Tests

Backend (Jest) :

```bash
docker compose exec backend pnpm test
```

Frontend (Vitest et Playwright) :

```bash
# Tests unitaires (Vitest)
docker compose exec client pnpm test:unit

# Tests end-to-end (Playwright)
docker compose exec client pnpm test:e2e
```

## 8. Avant de considérer une tâche finie

Avant toute soumission de contribution, assurez-vous que les vérifications passent :

- **Frontend** : `pnpm type-check` (ou `pnpm build`, qui enchaîne type-check + build).
- **Backend** : `pnpm build` (`nest build`).
- **Lint / format** (à la racine du dépôt) : `pnpm lint` et `pnpm format`.

Pour le détail du workflow de contribution (nommage des branches, conventional commits, revue), reportez-vous à [Contribution](./11-contribution.md).

Voir aussi : [Architecture](./02-architecture.md), [Permissions et sécurité](./06-permissions-et-securite.md), [Architecture backend](./08-architecture-backend.md), [Architecture frontend](./09-architecture-frontend.md).
