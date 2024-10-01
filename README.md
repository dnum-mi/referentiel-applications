# Référentiel des applications

## Introduction
L'application "Référentiel des applications"   est  cataloguer et gérer les informations sur les applications utilisées au sein du ministère de l'intérieur

### Objectif
Fournir un point de vérité pour répertorier, catégoriser et gérer les métadonnées des applications.

## Technologies Utilisées
- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Installation

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


## Endpoints de l'API

### Base URL
```plaintext
  http://localhost:3500
```

### Liste des Endpoints

### 1. Recherche Globale

```http
  GET /api/v1/global-search
```

| Parameter | Type      | Desciption                    |
|:----------|:----------|:------------------------------|
| `query`   | `string`  | **Requis**. Text a chercher   |

---
---

### 2. Organisations

>**Obtenir toutes les organisations**
```http
  GET /api/v1/organisations
```

| Parameter       | Type        | Desciption                                      |
|:----------------|:------------|:------------------------------------------------|
| `label`         | `string`    | Label de l'organisation recherché               |
| `code`          | `string`    | Code de l'organisation recherché                |
| `parent`        | `boolean`   | ...                                             |
| `searchQuery`   | `string`    | Nombre                                          |
| `currentPage`   | `number`    | Page actuelle                                   |
| `maxPerPage`    | `string`    | Max d'organisation par page                     |
| `key`           | `string`    | **Requis**. Clé de l'organisation recherché     |
| `order`         | `string`    | **Requis**. Ordre de tri de la recherche        |

---

>**Créer une nouvelle organisation**
```http
  POST /api/v1/organisations
```

**Requis** - Request Body : `application/json`
```json
{
  "label": "string",
  "desciption": "string",
  "organisationcode": "string"
}
```
---

>**Obtenir une organisation par ID**
```http
  GET /api/v1/organisations/
```

| Parameter | Type      | Desciption                        |
|:----------|:----------|:----------------------------------|
| `id`      | `string`  | **Requis**. ID de l'organisation  |

---

>**Mettre à jour une organisation**
```http
  PUT /api/v1/organisations/
```

| Parameter | Type      | Desciption                        |
|:----------|:----------|:----------------------------------|
| `id`      | `string`  | **Requis**. ID de l'organisation  |

**Requis** - Request Body : `application/json`
```json
{
  "label": "string",
  "desciption": "string",
  "organisationcode": "string"
}
```

---
---

### 3. Applications

>**Obtenir toutes les applications**
```http
  GET /api/v1/applications
```

| Parameter       | Type            | Desciption                                                        |
|:----------------|:----------------|:------------------------------------------------------------------|
| `nom`           | `string`        | Nom de/des l'application(s) recherché                             |
| `organisation`  | `string`        | Nom de l'organisation a laquel l'application recherché appartient |
| `sensibilite`    | `string / list` | Label de l'organisation recherché                                 |
| `statut`        | `string / list` | Label de l'organisation recherché                                 |
| `code`          | `string`        | Code de l'organisation recherché                                  |
| `parent`        | `boolean`       | ...                                                               |
| `searchQuery`   | `string`        | Nombre                                                            |
| `currentPage`   | `number`        | Page actuelle                                                     |
| `maxPerPage`    | `string`        | Max d'organisation par page                                       |
| `key`           | `string`        | **Requis**. Clé de l'organisation recherché                       |
| `order`         | `string`        | **Requis**. Ordre de tri de la recherche                          |

---

>**Créer une nouvelle application**
```http
  POST /api/v1/applications
```

**Requis** - Request Body : `application/json`
```json
{
  "longname": "string",
  "description": "string",
  "typeApplication": "SVBUS",
  "codeApplication": [
    {
      "typeCode": "string",
      "codeCourt": "string",
      "longcode": "string",
      "comments": "string"
    }
  ],
  "sensibilite": "S1",
  "statut": "BLD",
  "parent": "string",
  "organisation": "string",
  "organisationid": "string",
  "acteurRoles": [
    {
      "acteur": {},
      "organisation": {
        "label": "string",
        "description": "string",
        "organisationcode": "string"
      },
      "role": "string"
    }
  ],
  "instances": [
    {
      "comments": "string",
      "role": "string",
      "statut": "string",
      "tenant": "string",
      "fip": "string",
      "url": "string",
      "deploymentdate": {},
      "environment": {
        "environmentid": "string",
        "label": "string"
      }
    }
  ],
  "conformite": [
    {
      "comments": "string",
      "compliancetype": "string",
      "compliancelevel": "Dispens_e",
      "decisiondate": "2024-09-27T13:47:44.144Z",
      "validitydate": "2024-09-27T13:47:44.144Z",
      "auditdate": "2024-09-27T13:47:44.144Z",
      "description": "string"
    }
  ]
}
```

---

>**Récupéré une application par son ID**

```http
  GET /api/v1/applications
```

| Parameter | Type      | Desciption                        |
|:----------|:----------|:----------------------------------|
| `id`      | `string`  | **Requis**. ID de l'application   |

---

>**Mettre à jour une applications par ID**

```http
  PUT /api/v1/applications
```

| Parameter | Type      | Desciption                        |
|:----------|:----------|:----------------------------------|
| `id`      | `string`  | **Requis**. ID de l'application   |

**Requis** - Request Body : `application/json`
```json
{
  "longname": "string",
  "description": "string",
  "typeApplication": "SVBUS",
  "codeApplication": [
    {
      "typeCode": "string",
      "codeCourt": "string",
      "longcode": "string",
      "comments": "string"
    }
  ],
  "sensibilite": "S1",
  "statut": "BLD",
  "parent": "string",
  "organisation": "string",
  "organisationid": "string",
  "acteurRoles": [
    {
      "acteur": {},
      "organisation": {
        "label": "string",
        "description": "string",
        "organisationcode": "string"
      },
      "role": "string"
    }
  ],
  "instances": [
    {
      "comments": "string",
      "role": "string",
      "statut": "string",
      "tenant": "string",
      "fip": "string",
      "url": "string",
      "deploymentdate": {},
      "environment": {
        "environmentid": "string",
        "label": "string"
      }
    }
  ],
  "conformite": [
    {
      "comments": "string",
      "compliancetype": "string",
      "compliancelevel": "Dispens_e",
      "decisiondate": "2024-09-27T13:57:48.295Z",
      "validitydate": "2024-09-27T13:57:48.295Z",
      "auditdate": "2024-09-27T13:57:48.295Z",
      "description": "string"
    }
  ]
}
```