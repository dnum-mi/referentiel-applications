# Instructions Copilot

## Présentation du projet

`referentiel-applications` est un monorepo gérant un référentiel d'applications pour la Direction du Numérique du Ministère de l'Intérieur (DNUM-MI). Il est composé de :

- **backend/** : API NestJS (TypeScript) avec Prisma ORM, PostgreSQL, authentification JWT/Passport et documentation Swagger.
- **frontend/** : SPA Vue 3 (TypeScript) utilisant PrimeVue, Vue-DSFR (système de design de l'État français), Pinia et Vue Router.

## Stack technique

| Couche   | Technologie                                |
| -------- | ------------------------------------------ |
| Runtime  | Node.js ≥ 20.19, pnpm 10                   |
| Backend  | NestJS, Prisma, PostgreSQL, Passport-JWT   |
| Frontend | Vue 3, TypeScript, PrimeVue, DSFR, Pinia   |
| CI/CD    | Docker Compose, GitHub Actions             |
| Qualité  | ESLint (flat config), Prettier, commitlint |

## Conventions de développement

- **Gestionnaire de paquets** : toujours utiliser `pnpm`. Ne jamais utiliser `npm` ou `yarn`.
- **Commits** : suivre la convention Conventional Commits (imposée par commitlint). Types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.
- **Style de code** : exécuter `pnpm lint` et `pnpm format` avant de committer. La configuration ESLint flat config se trouve dans `eslint.config.js`.
- **Backend** : respecter les patterns NestJS modules/services/controllers. Les DTOs se placent dans les dossiers `dto/`. Utiliser les décorateurs `class-validator` pour la validation.
- **Frontend** : utiliser la Composition API (`<script setup>`). Privilégier les composants DSFR de `@gouvminint/vue-dsfr` autant que possible.
- **Types API** : les types OpenAPI partagés sont générés — exécuter `pnpm gen` (nécessite Docker) pour les regénérer après

## Conventions de nommage

### Backend (NestJS / Prisma)

| Élément              | Convention                          | Exemple                                               |
| -------------------- | ----------------------------------- | ----------------------------------------------------- |
| Fichiers             | `kebab-case` avec suffixe de rôle   | `application.service.ts`, `create-application.dto.ts` |
| Classes              | `PascalCase`                        | `ApplicationService`, `CreateApplicationDto`          |
| Interfaces / Types   | `PascalCase`                        | `ApplicationView`                                     |
| Modèles Prisma       | `PascalCase`                        | `Application`, `BusinessDivision`                     |
| Enums Prisma         | `PascalCase`                        | `ApplicationType`, `Status`                           |
| Valeurs d'enum       | `SCREAMING_SNAKE_CASE`              | `IN_PROGRESS`, `NOT_STARTED`                          |
| Méthodes / variables | `camelCase`                         | `findAllApplications`, `applicationId`                |
| Dossiers de modules  | `kebab-case`                        | `applications/`, `business-division/`                 |
| DTOs                 | suffixe `.dto.ts`, préfixe d'action | `create-application.dto.ts`, `get-application.dto.ts` |
| Use cases            | suffixe `.usecase.ts`               | `application-export.usecase.ts`                       |
| Schémas Prisma       | `kebab-case`                        | `business-division.prisma`, `data-source.prisma`      |

### Frontend (Vue 3 / TypeScript)

| Élément                       | Convention                     | Exemple                                            |
| ----------------------------- | ------------------------------ | -------------------------------------------------- |
| Composants Vue                | `PascalCase` + suffixe de rôle | `ApplicationCardView.vue`, `EditRelationModal.vue` |
| Vues (pages)                  | `PascalCase` + suffixe `Page`  | `ApplicationSearchPage.vue`, `AdminPage.vue`       |
| Composables                   | `kebab-case` + préfixe `use-`  | `use-application-search.ts`, `use-modal.ts`        |
| Stores Pinia                  | `camelCase` + suffixe `Store`  | `applicationStore.ts`, `userStore.ts`              |
| Services                      | `camelCase`                    | `authentication.ts`, `technicalDebt.ts`            |
| Modèles / Types               | `PascalCase`                   | `Application.ts`                                   |
| Fichiers de types utilitaires | `kebab-case`                   | `relation-type-filter.ts`, `table.ts`              |
| Variables / fonctions         | `camelCase`                    | `selectedApplication`, `fetchApplications()`       |
| Constantes                    | `SCREAMING_SNAKE_CASE`         | `MAX_PAGE_SIZE`, `DEFAULT_LOCALE`                  |

### Règles générales

- Les **noms de fichiers** sont toujours en `kebab-case` (backend et frontend).
- Les **composants Vue** font exception : leur nom de fichier est en `PascalCase`.
- Les **noms de classes et types** sont toujours en `PascalCase`.
- Éviter les abréviations non standard ; privilégier des noms explicites et en anglais.

## Structure du dépôt

```
backend/              # Application NestJS
  src/
    modules/          # Modules fonctionnels
    common/           # Utilitaires partagés, guards, décorateurs
  prisma/             # Schéma et migrations
frontend/             # SPA Vue 3
  src/
    components/       # Composants Vue réutilisables
    views/            # Vues au niveau des routes
    stores/           # Stores Pinia
    router/           # Configuration Vue Router
keycloak/             # Configuration du realm Keycloak
docker-compose*.yml   # Fichiers Compose pour les différents environnements
```

## Tests

- **Backend** : Jest + `@nestjs/testing`. Les fichiers de test sont **co-localisés** avec le fichier source (`application.service.spec.ts` à côté de `application.service.ts`).
- **Frontend unitaire** : Vitest + `@testing-library/vue`. Même convention de co-localisation (`.spec.ts` à côté du `.vue`).
- **Frontend e2e** : Cypress, fichiers dans `frontend/cypress/e2e/` avec l'extension `.cy.ts`.
- **Structure des tests** : utiliser des commentaires `// Given / // When / // Then` pour structurer les cas.
- **Mocks** : `vi.mock(...)` pour Vitest, `jest.mock(...)` pour Jest.
- **Module de test NestJS** : toujours créer un `TestingModule` avec `Test.createTestingModule({...})` et mocker les dépendances via `{ provide: ServiceX, useValue: mockServiceX }`.

## Gestion des erreurs (backend)

- **`BaseService`** : la méthode `findOne` lève automatiquement une `NotFoundException` si l'entité n'existe pas — ne pas dupliquer ce contrôle dans les services enfants.
- **Exceptions standard** : utiliser les exceptions NestJS intégrées (`NotFoundException`, `ForbiddenException`, `BadRequestException`) directement dans les services.
- **Exceptions custom** : étendre `HttpException` pour les cas spécifiques, ajouter un filtre `@Catch(MonException)` scopé au module concerné.
  ```ts
  export class MailSendException extends HttpException {
    constructor(message: string) {
      super(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  ```
- **Pas de filtre global** : pas de filtre d'exception global enregistré — se reposer sur la couche d'erreur par défaut de NestJS.

## Patterns API (backend)

- **Préfixe de route** = nom de la ressource au pluriel : `@Controller("applications")`.
- **Nommage des paramètres** : utiliser le nom de la ressource + `Id` (ex. `:applicationId`, pas `:id`).
- **Routes statiques avant les routes dynamiques** : déclarer les routes comme `/export/excel` ou `/data-quality/update` **avant** `:applicationId` dans le contrôleur.
- **Codes HTTP explicites** : `@HttpCode(HttpStatus.NO_CONTENT)` sur les suppressions, `@HttpCode(HttpStatus.ACCEPTED)` sur les opérations asynchrones.
- **Swagger obligatoire** : chaque endpoint doit avoir `@ApiOperation`, une réponse de succès (`@ApiOkResponse`, `@ApiCreatedResponse`…) et les réponses d'erreur (`@ApiForbiddenResponse`, `@ApiNotFoundResponse`).
- **Décorateurs custom** :
  - `@User()` → injecte l'objet `Requestor` complet depuis la requête.
  - `@UserId()` → injecte uniquement l'ID utilisateur.
  - `@RequiredPermissions([Permission.X])` → déclare les permissions requises (lu par `PermissionGuard`).
- **Pagination** : utiliser `PaginatedResponseDto<T>` (`{ results: T[], total: number }`) pour toutes les listes paginées. Query params standards : `page`, `pageSize` (défaut 15, max 100), `sortBy`, `order` (`asc` | `desc`).

## Stores Pinia (frontend)

- **Style Setup Store uniquement** — ne pas utiliser le style Options Store.
  ```ts
  export const useApplicationStore = defineStore("applicationStore", () => {
    const items = ref<Application[]>([]);
    const isLoading = ref(false);
    const fetchAll = async () => { ... };
    return { items, isLoading, fetchAll };
  });
  ```
- **Cache mémoire** : stocker les entités dans un objet indexé par ID (`applicationsById`) pour éviter les appels API redondants.
- **`isLoading`** : toujours gérer avec `try/finally` pour garantir la remise à `false` en cas d'erreur.
- **Notifications** : utiliser `toasterStore.addSuccessMessage()` / `toasterStore.addErrorMessage()` avant de relancer l'erreur.
- **Client API** : utiliser le client auto-généré depuis l'OpenAPI spec (`src/api/index.ts`) — appels typés `api.applicationControllerFindOne({...})`.
- **Nettoyage des filtres** : appeler `cleanFilters(params)` avant tout appel API pour supprimer les valeurs nulles/undefined.

## Configuration & environnement

- **Config typée** : utiliser `registerAs("namespace", () => ({...}))` et l'injecter avec `@Inject(config.KEY)`. Ne jamais lire `process.env` directement dans un service.
  ```ts
  @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>
  ```
- **Namespaces de config** : `app`, `database`, `email`, `oidc` — chaque namespace correspond à un fichier dans `backend/src/config/`.
- **Variables frontend** : préfixées `VITE_RDA_` (ex. `VITE_RDA_APP_VERSION`, `VITE_RDA_MATOMO_URL`). La config OIDC est servie dynamiquement par le `ConfigController` backend.
- **Secrets** : ne jamais committer de fichier `.env` — utiliser les variables d'environnement du CI/CD ou Docker Compose pour les environnements non-locaux.

## Docker & environnements

| Fichier                     | Usage                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `docker-compose.yml`        | **Développement local** — stack complète avec hot-reload                               |
| `docker-compose.prod.yml`   | **Production** — utilise des images pré-buildées (`BACK_IMAGE_TAG`, `FRONT_IMAGE_TAG`) |
| `docker-compose.ci.yml`     | **CI** — backend en mode prod, volume de coverage monté                                |
| `docker-compose.grist.yml`  | Service Grist optionnel (tableur collaboratif)                                         |
| `docker-compose.matomo.yml` | Service Matomo optionnel (analytics)                                                   |

**Ports standards en développement :**

| Service         | Port   |
| --------------- | ------ |
| Backend (API)   | `3500` |
| Frontend (Vite) | `5173` |
| Keycloak        | `8082` |
| PgAdmin         | `8081` |
| Mailpit (UI)    | `8025` |
| Prisma Studio   | `5555` |

## Accessibilité & langues

- **Pas d'i18n** : toutes les chaînes sont en **français** (UI, messages d'erreur, documentation Swagger). Ne pas introduire de librairie i18n sans décision d'équipe.
- **DSFR** : utiliser les composants `@gouvminint/vue-dsfr` en priorité — ils fournissent nativement la conformité ARIA, la navigation clavier et la sémantique HTML requise par le RGAA.
- **Analytics** : l'intégration Matomo est gérée via `vue-matomo` avec tracking par route.

## Git & release

- **Releases automatisées** : `release-please` gère la génération du `CHANGELOG.md` et le bumping de version SemVer à partir des messages de commit Conventional Commits.
- **Versioning** : SemVer strict — `feat:` → version mineure, `fix:` → patch, `BREAKING CHANGE` → majeure.
- **Style des commits** : Conventional Commits avec emojis optionnels en préfixe (ex. `:sparkles: feat: ...`, `:bug: fix: ...`). Les deux styles coexistent dans l'historique.
- **Branche principale** : les releases sont générées depuis `main`. Travailler sur des branches de feature et ouvrir des Pull Requests.
