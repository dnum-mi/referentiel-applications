# Contribuer

Le Référentiel des applications (RefApp) est un produit numérique du ministère de l'Intérieur (DNUM-MI), développé en monorepo (backend NestJS, frontend Vue 3, gestionnaire de paquets `pnpm`). Cette page décrit le processus de contribution réellement pratiqué par l'équipe : workflow de branche et de revue, format des messages de commit, hooks Git, contrôles qualité à exécuter avant chaque _pull request_, organisation des tests, chaîne d'intégration continue, gestion des versions et pièges à connaître.

## Sommaire

- [1. Pré-requis](#1-pré-requis)
- [2. Workflow de contribution](#2-workflow-de-contribution)
- [3. Conventional commits](#3-conventional-commits)
- [4. Hooks Git (Husky)](#4-hooks-git-husky)
- [5. Qualité avant une pull request](#5-qualité-avant-une-pull-request)
- [6. Tests](#6-tests)
- [7. Intégration continue](#7-intégration-continue)
- [8. Versionnage et release](#8-versionnage-et-release)
- [9. Pièges connus à respecter](#9-pièges-connus-à-respecter)
- [Récapitulatif](#récapitulatif)

## 1. Pré-requis

L'installation de l'environnement de développement (Node, `pnpm`, conteneurs Docker Compose, base de données, Keycloak, génération du client Prisma) est décrite dans le guide de [démarrage](./03-demarrage.md). Avant toute contribution, assurez-vous que la pile locale démarre et que la base est correctement migrée et amorcée (_seed_).

Les versions attendues sont fixées dans le `package.json` racine : Node `>=20.19.0` et `pnpm@10.14.0` (champ `packageManager`).

## 2. Workflow de contribution

Le projet suit un flux par branche et _pull request_ vers `main`, avec revue obligatoire.

1. **Créer une branche depuis `main`**, en suivant la convention de nommage :

   ```bash
   # Nouvelle fonctionnalité
   git switch -c feature/nom-de-la-feature

   # Correction de bug
   git switch -c fix/nom-du-fix
   ```

2. **Développer** en respectant les conventions de code et de commit (voir sections suivantes).

3. **Ouvrir une pull request** vers `main`. Le titre de la PR doit lui-même respecter les _conventional commits_ (il est validé en CI, voir section [7](#7-intégration-continue)).

4. **Faire relire la PR**. L'équipe pratique :
   - **une seule approbation requise** pour fusionner ;
   - **la fusion par l'auteur de la PR** (et non par le relecteur) ;
   - **`rebase and merge`** comme stratégie de fusion ;
   - le réamendement (`git commit --amend` suivi d'un `push -f`) tant que la PR n'est pas fusionnée.

5. **Ne jamais pousser directement sur la branche d'un autre contributeur** : ouvrir une PR distincte.

> Une PR non terminée doit être ouverte en **brouillon (_draft_)**. La « définition du fini » de l'équipe : PR fusionnée **et** testée fonctionnellement en local, CI verte, retours d'analyse de code (Sonar) traités. Pour une fonctionnalité couvrant le back et le front, on attend une protection des deux côtés ainsi qu'un test bout en bout.

Pour les signalements et demandes, des gabarits d'_issues_ sont fournis dans `.github/ISSUE_TEMPLATE/` : rapport de bug et demande de fonctionnalité.

## 3. Conventional commits

Le projet suit la spécification [**Conventional Commits**](https://www.conventionalcommits.org/fr/v1.0.0/) pour garantir la cohérence de l'historique et alimenter le versionnement automatique. La configuration (`commitlint.config.mjs`, à la racine) étend `@commitlint/config-conventional` :

```js
export default { extends: ["@commitlint/config-conventional"] };
```

Format général : `type(scope): description`, **en minuscules**, à l'impératif. Un correctif est un `fix`, jamais un `feat`.

**Types acceptés** (alignés sur la validation CI) : `feat`, `fix`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test`, `build`.

**Exemples :**

- `feat(auth): add login functionality`
- `fix(ui): correct button alignment`
- `docs(readme): update installation instructions`
- `refactor(api): simplify user query`
- `ci(docker): optimize build process`

La validation est appliquée à trois niveaux : localement par le hook Husky (section [4](#4-hooks-git-husky)), puis en CI sur **chaque commit de la PR** et sur **le titre de la PR** (workflow `commitlint.yml`).

## 4. Hooks Git (Husky)

Les hooks sont gérés par [Husky](https://typicode.github.io/husky/) (installé via le script `prepare` du `package.json` racine, exécuté à l'`install`). Deux hooks sont actifs :

| Hook         | Commande exécutée       | Rôle                                                   |
| ------------ | ----------------------- | ------------------------------------------------------ |
| `pre-commit` | `pnpm exec lint-staged` | Formatage automatique des fichiers indexés             |
| `commit-msg` | `pnpm commitlint`       | Validation du message de commit (conventional commits) |

La configuration `lint-staged` du `package.json` racine applique **Prettier** à tous les fichiers indexés :

```json
"lint-staged": {
  "**/*": "prettier --write --ignore-unknown"
}
```

Prettier ignore notamment `build`, `coverage`, `pnpm-lock.yaml`, `CHANGELOG.md`, `swagger.yaml` et `realm-export.json` (voir `.prettierignore`).

## 5. Qualité avant une pull request

Avant de considérer une tâche comme finie, exécutez les contrôles correspondant à la partie modifiée. Les commandes ci-dessous sont celles définies dans les `package.json` du dépôt.

**Racine** (formatage et lint transverses) :

```bash
pnpm run format   # prettier . --write
pnpm run lint     # eslint .
```

**Backend** (`backend/`) :

```bash
pnpm run build      # nest build (compilation TypeScript)
pnpm run db:generate # prisma generate (client Prisma à jour)
pnpm run test       # jest (tests)
pnpm run test:cov   # jest --coverage (couverture, comme en CI)
```

**Frontend** (`frontend/`) :

```bash
pnpm run type-check   # vue-tsc --build --force (typage Vue/TS)
pnpm run api:generate # openapi-ts (régénère le client API, voir §9)
pnpm run test:unit    # vitest run (tests unitaires)
pnpm run test:e2e     # playwright test (tests bout en bout)
pnpm run build        # type-check + build de production
```

> Conformément aux préférences de l'équipe, ne déclarez une tâche terminée qu'après vous être assuré que le **lint**, le **typage** (front), le **build** (back) et les **tests** passent.

## 6. Tests

| Périmètre               | Outil                | Emplacement                                                | Commande                            |
| ----------------------- | -------------------- | ---------------------------------------------------------- | ----------------------------------- |
| Backend                 | **Jest** (tests e2e) | `backend/tests/` (fichiers `*.e2e-spec.ts`)                | `pnpm test`, `pnpm test:cov`        |
| Frontend — unitaires    | **Vitest**           | `frontend/` (config `vitest.config.ts`, `vitest-setup.ts`) | `pnpm test:unit`                    |
| Frontend — bout en bout | **Playwright**       | `frontend/tests/` (fichiers `*.spec.ts`)                   | `pnpm test:e2e`, `pnpm test:e2e:ui` |

Le projet a migré ses tests bout en bout de **Cypress vers Playwright** ; un dossier `frontend/cypress/` peut subsister mais Playwright est l'outil de référence.

Les tests Playwright intègrent un contrôle d'**accessibilité automatisé** via `@axe-core/playwright` (par exemple `frontend/tests/qualityPage.spec.ts`, qui vérifie l'absence de violation critique). Cette approche s'inscrit dans la démarche de conformité décrite dans la page [accessibilité (RGAA)](./10-accessibilite-rgaa.md).

L'exécution des tests backend en local et en CI s'appuie sur la pile Docker Compose (backend, PostgreSQL, Keycloak) ; la base est amorcée par un **_seed_ déterministe** dédié (`pnpm db:seed`) afin de ne pas polluer les données de développement.

## 7. Intégration continue

Les workflows GitHub Actions se trouvent dans `.github/workflows/`.

| Workflow            | Déclencheur                                               | Rôle                                                                                                                                                        |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main-ci.yml`       | `push` et `pull_request` sur `main` et `dev`, ou manuel   | Pipeline principal : build des images Docker back et front, lint + Prettier (`--check`), tests unitaires (appel à `tests-unit.yml`) et tests e2e Playwright |
| `commitlint.yml`    | `pull_request` (ouverture, édition, synchro, réouverture) | Valide les **messages de commit** de la PR et le **titre** de la PR (conventional commits)                                                                  |
| `tests-unit.yml`    | Appelé par `main-ci.yml` (ou manuel)                      | Démarre la pile Docker, applique les migrations Prisma, lance la couverture backend (seuil 70 %) puis le scan SonarQube (back + front)                      |
| `build.yml`         | Workflow réutilisable (`workflow_call`)                   | Construit et pousse une image Docker (back ou front) vers `ghcr.io/dnum-mi/referentiel-applications`                                                        |
| `release.yml`       | `push` sur `main`                                         | Exécute **release-please** pour préparer/publier les versions                                                                                               |
| `release-build.yml` | `push` d'un tag `v*` ou manuel                            | Construit et pousse les images Docker de la version publiée                                                                                                 |

Le pipeline e2e démarre la pile (`docker compose ... up backend postgres keycloak`), amorce la base (`pnpm db:seed`), installe les navigateurs Playwright, **régénère le client API** (`pnpm openapi-ts`) puis lance `pnpm test:e2e`.

## 8. Versionnage et release

La gestion des versions est entièrement automatisée par **[release-please](https://github.com/googleapis/release-please-action)** (workflow `release.yml`, déclenché sur `main`).

- La **branche par défaut est `main`**.
- À partir des _conventional commits_ fusionnés, release-please ouvre (puis fusionne) une **PR de release** qui met à jour la version, le `CHANGELOG.md` et le manifeste de version.
- La configuration se trouve dans `release-please-config.json` (paquet unique à la racine, `package-name: referentiel-applications`) et la version courante dans `.release-please-manifest.json`.
- La publication d'un tag de version déclenche `release-build.yml`, qui construit et pousse les images Docker correspondantes.

L'équipe produit une release **à chaque déploiement en qualification** ; le flux type est : fusion de la release → qualification → validation métier → production.

## 9. Pièges connus à respecter

Quelques règles éprouvées, à respecter impérativement en contribution :

- **Migrations Prisma** : utilisez toujours `pnpm db:dev` (`prisma migrate dev`) pour créer une migration ; **n'utilisez jamais `prisma db push`**. Les contraintes `CHECK`, les migrations de données et les vues SQL doivent être écrites en **SQL** dans le fichier de migration.
- **`pnpm prisma format`** est attendu sur les modèles. Conventions Prisma : modèles au **singulier PascalCase** ; pas de `@@map` superflu (source de migrations parasites).
- **Régénérer le client front après une modification de l'API back** : exécutez `pnpm gen` (front) — soit `pnpm api:generate` (`openapi-ts`). Oublier cette étape provoque des erreurs du type `api.XxxControllerCreate is not a function` ou un écran blanc.
- **Ne pas éditer `frontend/src/client/**`** : ce répertoire est **généré** (et ignoré par Git). En revanche, `frontend/openapi/swagger.yaml` (l'_input_ de génération) **doit être commité** ; tout nouveau DTO doit être déclaré dans les schémas Swagger (`@ApiProperty`).
- **Pas de secrets en dur** dans le code ni dans les commits. La configuration backend passe par le module de configuration NestJS (pas de `process.env` sauvage).
- **Ne jamais exposer en clair les listes d'hébergement** du ministère ni aucune donnée sensible dans le dépôt ou la documentation.
- **Limiter le SQL brut** côté backend et **trier/paginer côté base de données** (jamais en mémoire).
- **Pas d'emojis dans le code** (code open source du MI).

## Récapitulatif

- **Workflow** : branche `feature/*` ou `fix/*` depuis `main`, PR avec **1 approbation**, fusion par l'auteur en **`rebase and merge`**, brouillon si non terminée.
- **Commits** : conventional commits en minuscules, validés par Husky (`commit-msg`) et en CI (`commitlint.yml`).
- **Hooks** : `pre-commit` → `lint-staged` (Prettier) ; `commit-msg` → `commitlint`.
- **Qualité avant PR** : `pnpm run lint` / `format` (racine), `pnpm run build` + `test`/`test:cov` (back), `pnpm run type-check` + `test:unit` + `test:e2e` (front).
- **Tests** : Jest (back), Vitest + Playwright avec `@axe-core/playwright` (front).
- **CI** : `main-ci.yml` (build + lint + tests + e2e), `commitlint.yml`, `tests-unit.yml` (couverture + Sonar), `build.yml`, `release.yml`, `release-build.yml`.
- **Release** : automatisée par **release-please** sur `main`.
- **Pièges** : `db:dev` (jamais `db push`), `pnpm gen` après modif d'API, ne pas éditer `frontend/src/client/**`, commiter `swagger.yaml`, aucun secret ni liste d'hébergement en clair.
