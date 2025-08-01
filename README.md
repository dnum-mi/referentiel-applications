# Référentiel des applications

## Introduction

L'application "Référentiel des applications" est de cataloguer et gérer les informations sur les applications utilisées au sein du ministère de l'intérieur

### Objectif

Fournir un point de vérité pour répertorier, catégoriser et gérer les métadonnées des applications.

## Technologies Utilisées

- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/)

## Installation

### Prérequis

Liste des outils utilisés par le projet à installer :

- [Docker](https://docs.docker.com/get-started/get-docker/)

### How to run ?

1. Run the stack

```bash
docker compose up -d
```

2. Run migrations (in the backend container)

```bash
npx prisma migrate deploy
```

### How to stop ?

```bash
docker compose down
```

### Conventional commit

Nous suivons les Conventional Commits pour garantir la cohérence et faciliter le versionnement. Voici quelques exemples:
•feat(auth): add login functionality
• fix(ui): correct button alignment
• docs(readme): update installation instructions

Les commits sont validés automatiquement à l’aide de Husky et Commitlint.

### Contribution

Workflow de Contribution

1.  Créez une branche depuis main:

```bash
git switch -c feature/your-feature-name
```

2. Assurez-vous que le code respecte les normes:

• Formatage:

```bash
pnpm run format
```

### More

See [docker-compose.yml](docker-compose.yml) for services definitions.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
