# Référentiel des applications

## Introduction
L'application "Référentiel des applications" est de cataloguer et gérer les informations sur les applications utilisées au sein du ministère de l'intérieur

### Objectif
Fournir un point de vérité pour répertorier, catégoriser et gérer les métadonnées des applications.

## Technologies Utilisées
- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Installation

### Prérequis

Liste des outils utilisés par le projet à installer :
- [Docker](https://docs.docker.com/get-started/get-docker/)
- [NodeJs](https://nodejs.org/en/download/package-manager)

### Étapes d'Installation

1. **Installer les dépendances**
    ```bash
    npm install
    ```

2. **Configurer les variables d'environnement**
    ```bash
    cp .env.example .env
    # Modifier le fichier .env selon vos besoins
    ```

### Démarrage de l'API
> L'API sera accessible a l'adresse [http://localhost:3500](http://localhost:3500/)

> Le swagger de l'API sera accessible a l'adresse [http://localhost:3500/api/v1]()
```bash
  npm run docker:start
```

### Arret de l'API
```bash
  npm run docker:stop
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

