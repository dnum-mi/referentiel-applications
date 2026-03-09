# Référentiel des applications

![Build Status](https://img.shields.io/github/actions/workflow/status/dnum-mi/referentiel-applications/main-ci.yml?branch=main)
![Licence](https://img.shields.io/github/license/dnum-mi/referentiel-applications)
![Issues](https://img.shields.io/github/issues/dnum-mi/referentiel-applications)
![Pull Requests](https://img.shields.io/github/issues-pr/dnum-mi/referentiel-applications)
![Contributeurs](https://img.shields.io/github/contributors/dnum-mi/referentiel-applications)
![Version](https://img.shields.io/github/v/tag/dnum-mi/referentiel-applications)

Un projet visant à cataloguer et gérer les informations sur les applications utilisées au sein du ministère de l'Intérieur. L'objectif est de fournir un point de vérité unique pour répertorier et gérer les métadonnées de ces applications.

## 📚 Table des matières

- [Référentiel des applications](#référentiel-des-applications)
  - [📚 Table des matières](#-table-des-matières)
  - [Technologies Utilisées](#technologies-utilisées)
  - [Prérequis](#prérequis)
  - [🚀 Installation et Démarrage](#-installation-et-démarrage)
    - [1. Cloner le dépôt](#1-cloner-le-dépôt)
    - [2. Démarrer les services Docker](#2-démarrer-les-services-docker)
    - [3. Configurer le Backend](#3-configurer-le-backend)
    - [4. Configurer le Client (Frontend)](#4-configurer-le-client-frontend)
  - [🛠️ Accès Administrateur en Mode Développement](#️-accès-administrateur-en-mode-développement)
  - [Commandes Utiles](#commandes-utiles)
    - [Voir les logs en direct](#voir-les-logs-en-direct)
    - [Arrêter l'environnement](#arrêter-lenvironnement)
  - [🧪 Lancer les Tests](#-lancer-les-tests)
  - [🤝 Contribution](#-contribution)
    - [Workflow de Contribution](#workflow-de-contribution)
    - [Conventional Commits](#conventional-commits)
  - [📄 Licence](#-licence)

## Technologies Utilisées

- **Backend** : [NestJS](https://nestjs.com/) avec [TypeScript](https://www.typescriptlang.org/)
- **Base de données** : [PostgreSQL](https://www.postgresql.org/)
- **ORM** : [Prisma](https://www.prisma.io/)
- **Conteneurisation** : [Docker](https://www.docker.com/) & Docker Compose

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants sur votre machine :

- [Docker](https://docs.docker.com/get-started/get-docker/)
- [Git](https://git-scm.com/)

## 🚀 Installation et Démarrage

Suivez ces étapes pour lancer l'environnement de développement complet.

### 1. Cloner le dépôt

```bash
git clone https://github.com/dnum-mi/referentiel-applications.git
cd referentiel-applications
```

### 2. Démarrer les services Docker

Cette commande va construire les images des conteneurs (si nécessaire) et les démarrer en arrière-plan.

```bash
docker compose up --build
```

### 3. Configurer le Backend

Exécutez ces commandes pour préparer la base de données et le client Prisma :

```bash
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate deploy
docker compose exec backend pnpm prisma db seed
docker compose exec backend pnpm cmd user create -e admin@example.com -a 30 # Permet de créer un utilisateur administrateur, pas nécessaire si seed utilisé.
```

For stress seeding use `docker compose exec backend pnpm prisma db seed -- --environment stress`

### 4. Configurer le Client (Frontend)

Si votre projet inclut un frontend, cette commande génère le code nécessaire pour communiquer avec l'API backend :

```bash
docker compose exec client bash pnpm api:generate
```

🎉 **Félicitations, l'environnement est prêt !**

## 🛠️ Accès Administrateur en Mode Développement

Pour obtenir les droits administrateur en local:

1. Rendez-vous sur [http://localhost:5555](http://localhost:5555)
2. Trouvez l’utilisateur à modifier dans l’interface dédiée
3. Ajustez le champ `level` pour lui donner le rôle admin (un niveau élevé correspond à l’admin)

## Commandes Utiles

### Voir les logs en direct

Pour suivre les logs de tous les services (backend, bdd, etc.) :

```bash
docker compose logs -f
```

Pour voir les logs d'un service spécifique (ex: `backend`) :

```bash
docker compose logs -f backend
```

### Arrêter l'environnement

Pour arrêter et supprimer les conteneurs :

```bash
docker compose down
```

## 🧪 Lancer les Tests

Pour exécuter la suite de tests automatisés du backend :

```bash
docker compose exec backend pnpm test
```

_**Les tests unitaires se trouvent dans le dossier `/backend/test`. Pour ajouter un test, créez un fichier `.spec.ts` dans ce dossier.**_

## 🤝 Contribution

### Workflow de Contribution

1. Créez une branche depuis `main` en suivant la convention de nommage :

   ```bash
   # Pour une nouvelle fonctionnalité
   git switch -c feature/nom-de-la-feature

   # Pour une correction de bug
   git switch -c fix/nom-du-fix
   ```

2. Assurez-vous que votre code respecte les normes de formatage avant de commit :

   ```bash
   pnpm run format
   ```

3. Avant de soumettre une PR :
   - Vérifiez que tous les tests passent
   - Vérifiez que le code est correctement formaté

### Conventional Commits

Nous suivons les [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/) pour garantir la cohérence et faciliter le versionnement. Le format est validé automatiquement avant chaque commit grâce à Husky et Commitlint.

**Exemples :**

- `feat(auth): add login functionality`
- `fix(ui): correct button alignment`
- `docs(readme): update installation instructions`
- `refactor(api): simplify user query`
- `ci(docker): optimize build process`

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

[MIT License](https://opensource.org/licenses/MIT)
