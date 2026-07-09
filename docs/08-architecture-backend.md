# Architecture backend (NestJS)

Cette page décrit l'organisation interne du backend du **Référentiel des Applications** (RefApp, DNUM-MI) : le démarrage de l'application, l'anatomie d'un module, les conventions d'imports, le service de base mutualisé, l'accès aux données via Prisma, la validation des DTO, l'application des permissions au niveau des handlers, l'outil d'administration en ligne de commande et les tests. Chaque convention est rattachée au code réel (`chemin:lignes`) afin de rester fidèle à l'implémentation.

Le backend est une API **NestJS 10** adossée à **Prisma 6 / PostgreSQL** (`@prisma/client@6.3.0`, voir `backend/package.json:45`). L'ensemble du code applicatif se trouve sous `backend/src/`.

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Anatomie d'un module](#anatomie-dun-module)
- [Conventions d'imports](#conventions-dimports)
- [BaseService : audit et recalcul de l'IQ](#baseservice--audit-et-recalcul-de-liq)
- [Accès aux données Prisma](#accès-aux-données-prisma)
- [DTO et validation](#dto-et-validation)
- [Permissions côté handler](#permissions-côté-handler)
- [CLI d'administration](#cli-dadministration)
- [Tests](#tests)
- [Récapitulatif](#récapitulatif)

## Vue d'ensemble

Le point d'entrée est `backend/src/main.ts`. La fonction `bootstrap()` crée l'application à partir du module racine `AppModule`, puis applique la configuration transverse (`backend/src/main.ts:12-44`) :

- **Préfixe global `/api/v2`** : toutes les routes sont exposées sous ce préfixe (`backend/src/main.ts:13`, `:20`).
- **Sécurité HTTP** : `helmet()` est appliqué globalement (`backend/src/main.ts:21`).
- **CORS** : origines autorisées lues depuis `ALLOWED_ORIGINS` (CSV), avec `credentials: true` (`backend/src/main.ts:26-31`).
- **Logs** : logger Pino injecté via `nestjs-pino` (`backend/src/main.ts:19`).
- **Swagger** : documentation montée par `setupSwagger(...)` sur `/swagger` (JSON sur `/swagger/json`, YAML sur `/swagger/yaml`), voir `backend/src/swagger-config.ts:62-67`.
- **Validation globale** : `setupGlobalValidation(app)` enregistre le `ValidationPipe` (`backend/src/main.ts:37`, détaillé plus bas).

Le module racine `AppModule` (`backend/src/app.module.ts`) agrège l'ensemble des modules métier et transverses. Il charge la configuration globale (`@nestjs/config`, `isGlobal: true`, fichiers chargés via `configs`, `backend/src/app.module.ts:39-44`) et le planificateur `ScheduleModule.forRoot()` (`:38`).

L'**authentification** repose sur un middleware appliqué dans `AppModule.configure()` (`backend/src/app.module.ts:79-84`) :

```ts
consumer
  .apply(AuthMiddleware)
  .exclude("/health-check", "/swagger/**", "", "/config")
  .forRoutes("*");
```

`AuthMiddleware` (`backend/src/middlewares/auth.middleware.ts`) accepte deux modes d'authentification : un en-tête de clé d'API (résolu via `TokenService`, `:47-48`) ou un jeton JWT OIDC porté par l'en-tête `Authorization` (`:49-56`). Le JWT est vérifié contre le JWKS distant (`jose`, `:37`, `:52`) — sauf si `DISABLE_JWT_VALIDATION` est positionné, auquel cas le jeton est seulement décodé (`:50-52`). En cas de succès, le middleware enrichit `req.user` avec les permissions calculées depuis le rôle (`roleToPermissions`, `:63-66`) et journalise la connexion (`:68`). En cas d'échec, une `UnauthorizedException` est levée (`:71-75`). Le détail de l'authentification et du modèle de permissions est traité dans [Permissions et sécurité](./06-permissions-et-securite.md).

## Anatomie d'un module

Un module NestJS suit la convention `xxx.module.ts` / `xxx.controller.ts` / `xxx.service.ts` / `dto/`, avec éventuellement un répertoire `map/` pour produire les objets `connect` de Prisma. Le projet propose deux niveaux de complexité.

### Exemple simple : le module `actor`

`backend/src/actor/` est un module compact :

- `actor.module.ts` (`backend/src/actor/actor.module.ts`) : importe `PrismaModule`, `ApplicationModule`, `MetadatasModule`, `EmailModule`, `CommonModule` ; déclare deux contrôleurs (`ApplicationActorsController`, `ActorController`) ; fournit et exporte `ActorService`.
- `actor.controller.ts` (`backend/src/actor/actor.controller.ts`) : deux contrôleurs distincts. `ActorController` expose `GET /actors/count` sans garde (`:38-52`). `ApplicationActorsController` est monté sur `applications/:applicationId/actors` (`:61`) et porte les opérations CRUD protégées par `@UseGuards(PermissionGuard)` et `@RequiredPermissions(...)`.
- `dto/actor.dto.ts` (`backend/src/actor/dto/actor.dto.ts`) : `CreateActorDto`, `UpdateActorDto` (via `PartialType`), `ActorDto`, `ActorFiltersDto`.
- `map/actor.map.ts` (`backend/src/actor/map/actor.map.ts`) : fonction `actorMap(...)` qui transforme un DTO en payload Prisma en générant les relations `connect` (`organization`, `application`, `actorType`) à partir des identifiants fournis.

Le service (`backend/src/actor/actor.service.ts`) n'hérite pas du service de base : il **instancie** un `BaseService` typé sur `ActorWithRelations` / `Prisma.ActorDelegate` (`:21-24`, `:37-41`) et lui délègue le CRUD tout en gérant ses propres effets (notifications email, calcul de champs modifiés). C'est le pattern « instancié, pas hérité » décrit plus bas.

### Exemple riche : le module `applications`

`backend/src/applications/` illustre une organisation en couches plus poussée (`backend/src/applications/application.module.ts:17-41`) :

- **Contrôleur** : `application.controller.ts` (routes `applications`, Swagger détaillé, gardes par handler).
- **Service applicatif** : `application.service.ts` orchestre la logique métier, les transactions (`prisma.$transaction`, `:52-88`) et le recalcul de l'IQ (`:90`, `:426-432`).
- **Repository** : `infrastructure/repository/application.repository.ts` (+ son interface `application.repository.interface.ts`) isole les requêtes Prisma complexes (recherche paginée, agrégats, relations profondes).
- **Constructeur de requêtes** : `prisma-query-builder.service.ts` (`PrismaQueryBuilder`) bâtit dynamiquement les clauses `where`/`orderBy` à partir des filtres de recherche et du `Requestor` (`:16-...`), y compris des requêtes brutes (`$queryRawUnsafe`) pour les groupes d'acteurs (`:29-33`).
- **Use-cases** : `usecases/application-export.usecase.ts` (`ExportApplicationsUseCase`) encapsule un cas d'usage transverse (export).
- **Services annexes** : `export.service.ts`, `view.service.ts`.
- **DTO** : `dto/` (création, recherche, lecture, points de dette technique…).

Ce découpage est le modèle à suivre pour tout module dont la logique dépasse un CRUD simple : controller fin, service orchestrateur, repository pour l'accès Prisma, query builder pour les filtres, use-cases pour les cas transverses.

## Conventions d'imports

- **Imports absolus depuis `src/`** pour le code inter-module : `import { PrismaService } from "src/prisma/prisma.service"` (`backend/src/common/base.service.ts:5`), `import { BaseService } from "src/common/base.service"` (`backend/src/actor/actor.service.ts:7`).
- **Imports relatifs en intra-module** : `import { ActorService } from "./actor.service"` (`backend/src/actor/actor.module.ts:11`), `import { ActorFiltersDto } from "./dto/actor.dto"` (`backend/src/actor/actor.service.ts:11-15`).
- **Pas d'alias `@/`** : la base utilise systématiquement le préfixe `src/` (résolu via `baseUrl` TypeScript), jamais d'alias `@/...`.

## BaseService : audit et recalcul de l'IQ

`BaseService` (`backend/src/common/base.service.ts`) est un service générique **instancié avec un delegate Prisma**, et non hérité. Sa signature (`backend/src/common/base.service.ts:9-16`) prend en premier argument le `model` (un delegate Prisma, ex. `prisma.actor`), puis `PrismaService`, et optionnellement `MetadatasService` et `ApplicationService` :

```ts
@Injectable()
export class BaseService<T, TDelegate = any> {
  constructor(
    protected readonly model: any,
    protected readonly prisma: PrismaService,
    private readonly metadataService?: MetadatasService,
    private readonly applicationService?: ApplicationService,
  ) {}
```

L'instanciation se fait dans le constructeur du service métier (`backend/src/actor/actor.service.ts:37-41`) :

```ts
this.baseService = new BaseService<ActorWithRelations, Prisma.ActorDelegate>(
  prisma.actor,
  prisma,
  metadataService,
  applicationService,
);
```

Le `BaseService` expose `findOne`, `findAll`, `countAll`, `create`, `update`, `delete` (`backend/src/common/base.service.ts:18-86`). Les méthodes d'écriture acceptent un objet `ServiceOptions<T>` qui pilote deux effets de bord transverses :

- **Audit (Metadata)** : si `options.metadata` et un `applicationId` sont fournis, une entrée d'historique est créée via `metadataService.createMetadata(...)` (`backend/src/common/base.service.ts:115-149`). La configuration `MetadataConfig<T>` porte `userId`, `entity`, `gender`, un `getColumn?` (libellé dérivé de l'entité) et `fields?` pour le suivi des champs modifiés (`backend/src/common/utils/types.ts:49-55`). Voir l'usage côté acteur : `backend/src/actor/actor.service.ts:60-71` (création) et `:122-139` (mise à jour avec `fields`).
- **Recalcul de l'indice de qualité (IQ)** : à chaque écriture, `updateApplicationQuality(applicationId)` est invoqué (`backend/src/common/base.service.ts:88-106`, `:151-155`). À la suppression, ce recalcul est protégé par un `try/catch` silencieux (`updateApplicationQualitySafely`, `:157-161`). Le recalcul délègue à `ApplicationService.updateApplicationQuality`, qui appelle `calculateIQ(...)` (`backend/src/applications/application.service.ts:426-432`).

Le calcul de l'IQ lui-même est centralisé dans `backend/src/common/utils/quality.utils.ts` : `calculateIQ(applicationId, prisma)` charge en parallèle l'application, son hébergement, ses acteurs (avec type), sa conformité et ses ressources externes (`:7-16`), puis applique une grille de règles pondérées par niveau d'importance (1, 2, 3) selon la présence de description, d'hébergement, des rôles d'acteurs MOA/MOE/TMA/HEB/REP, des données PDMA/DIMA, de l'homologation et d'un lien « snapvisu » (`:18-50`). Le score final est la somme de trois sous-scores positionnels (`:52-68`).

> Le type `ServiceOptions<T>` est défini dans `backend/src/common/utils/types.ts:56-62` (`applicationId`, `triggerQualityUpdate`, `metadata`, `include`, `existingEntity`). Le champ `existingEntity` permet d'éviter un second `findOne` lors d'une mise à jour.

## Accès aux données Prisma

`PrismaService` (`backend/src/prisma/prisma.service.ts`) étend un `PrismaClient` enrichi de deux extensions Prisma (`backend/src/prisma/prisma.service.ts:16-17`, `:40`). Il est exposé par `PrismaModule`, déclaré **`@Global()`** (`backend/src/prisma/prisma.module.ts:6-12`), donc injectable partout sans réimport explicite.

Deux extensions sont appliquées :

- **`paginate`** (`backend/src/prisma/extensions/pagination.extension.ts`) : ajoutée à `$allModels`, elle accepte `page` / `pageSize` en plus des arguments `findMany`, exécute en parallèle `findMany` et `count`, et renvoie `{ results, total }` typé `PaginatedResponseDto<...>` (`:16-42`). C'est ce que renvoie `BaseService.findAll` (`backend/src/common/base.service.ts:26-31`) et qu'utilisent les repositories (`backend/src/applications/infrastructure/repository/application.repository.ts:64-103`).
- **`decimalToNumber`** (`backend/src/prisma/extensions/decimal-to-number.extension.ts`) : intercepte toutes les opérations et convertit récursivement les `Prisma.Decimal` en `number` (`:14-24`). Conséquence pratique : dans les repositories, les résultats sont castés vers les DTO API via `as unknown as XxxDto`, car le typage statique ne reflète pas la conversion runtime (voir `application.repository.ts:113-124` et `:150-155`, commentaires à l'appui).

### Migrations

Les scripts Prisma sont définis dans `backend/package.json:12-26` :

- **`db:dev`** (`prisma migrate dev`) pour créer une véritable migration en développement. **Ne jamais utiliser `prisma db push`** : on passe systématiquement par une migration versionnée.
- `db:deploy` (`prisma migrate deploy`) en production (également appelé au démarrage prod, `:20`).
- `db:reset`, `db:generate`, `db:seed`.

Les **contraintes `CHECK`** et les **migrations de données** s'écrivent en **SQL manuel** dans le fichier de migration. Attention également aux **vues SQL** lors des évolutions de schéma. Le détail du modèle de données figure dans [Modèle de données](./04-modele-de-donnees.md) et le mode opératoire complet dans [Contribution](./11-contribution.md).

## DTO et validation

Les DTO combinent **`class-validator`** (règles de validation) et **`@ApiProperty`** (documentation Swagger). Exemple `CreateApplicationDto` (`backend/src/applications/dto/create-application.dto.ts:15-121`) : `@IsString`, `@MinLength`, `@IsNotEmpty`, `@IsArray`, `@IsEnum`, `@IsOptional`, `@ValidateNested` + `@Type(...)` pour les objets imbriqués.

Les DTO de mise à jour sont dérivés via les _mapped types_ de `@nestjs/swagger` :

- **`PartialType`** : `UpdateActorDto extends PartialType(CreateActorDto)` (`backend/src/actor/dto/actor.dto.ts:72`).
- **`OmitType`** combiné à `PartialType` : `PatchApplicationDto extends PartialType(OmitType(CreateApplicationDto, ["status"]))` (`backend/src/applications/dto/create-application.dto.ts:123-125`).

La **validation globale** est stricte (`backend/src/config/app-config.ts:8-19`) :

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
});
```

`whitelist` retire les propriétés non décorées, `forbidNonWhitelisted` rejette toute propriété inconnue, `transform` instancie les DTO ; la conversion implicite de types est désactivée. Cette configuration est partagée entre l'application et les tests (`backend/src/main.ts:37`).

## Permissions côté handler

Les autorisations sont appliquées au niveau du handler en combinant `@UseGuards(PermissionGuard)` et `@RequiredPermissions([...])`. Sur le contrôleur d'acteurs lié à une application (`backend/src/actor/actor.controller.ts:54-67`) :

```ts
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/actors")
export class ApplicationActorsController {
  @Post()
  @RequiredPermissions([Permission.ActorWrite])
  public create(@Param("applicationId") applicationId: string, ...) { ... }
```

`@RequiredPermissions` pose une métadonnée (`SetMetadata(REQUIRED_PERMISSIONS, permissions)`, `backend/src/common/decorators/required-permissions.decorator.ts:5-7`). `PermissionGuard` la relit via le `Reflector` ; en l'absence de permission requise il laisse passer (`return true`), sinon il extrait `req.user` et le **paramètre de route `applicationId`** puis délègue à `CheckPermissions.can(required, user, applicationId)` (`backend/src/common/guards/permission.guard.ts:15-30`). Le paramètre `applicationId` permet d'évaluer les permissions au niveau d'une application précise. Le modèle de permissions (rôles globaux et permissions par application, énumérées dans `backend/src/common/utils/types.ts:7-32`) est détaillé dans [Permissions et sécurité](./06-permissions-et-securite.md).

## CLI d'administration

Le backend embarque une CLI bâtie avec **commander** sous `backend/src/cmd/`. Le point d'entrée `index.ts` instancie le programme `refapp-cli` et enregistre la commande `user` (`backend/src/cmd/index.ts:4-11`), qui rattache la sous-commande `create` (`backend/src/cmd/user/index.ts:4-8`).

### Incohérence confirmée sur `user create`

La commande `user create` (`backend/src/cmd/user/create.ts`) présente un **écart entre l'option déclarée et la valeur lue** :

- L'option déclarée est **`-a, --admin-level <level>`** (`backend/src/cmd/user/create.ts:18-23`). Avec commander, ce nom long produit la propriété **`options.adminLevel`**.
- L'action lit en revanche **`options.role`** : `const role = options.role;` (`backend/src/cmd/user/create.ts:27-28`), valeur ensuite validée contre l'énumération `Roles` puis utilisée pour l'upsert (`:29-49`).

En l'état, l'option mandataire `--admin-level` alimente `options.adminLevel`, qui n'est jamais consommée ; `options.role` reste `undefined`, la validation `typeguardIncludes(role, [...])` échoue et la commande sort en erreur (`role arg must be Roles enum`, `:37-38`).

- **Usage attendu** : créer ou mettre à jour un utilisateur par `--email` en lui affectant un rôle de l'énumération `Roles` (`ADMIN`, `CONTRIBUTOR`, `READER`, `VISITOR`).
- **Point à corriger** : aligner l'option et la lecture — soit renommer l'option en `--role`, soit lire `options.adminLevel` dans l'action. Le type de l'argument d'action devrait être ajusté en conséquence (`{ email: string; role: string }` ne correspond pas au nom d'option déclaré).

## Tests

Les tests utilisent **Jest** (`backend/package.json:22-26`, configuration `testRegex: ".*\\.*spec\\.ts$"`, `:115`). On trouve par exemple `backend/src/prisma/prisma.service.spec.ts`. Le `ValidationPipe` global est mutualisé entre l'application et les tests via `setupGlobalValidation` afin que les tests reflètent le comportement réel. Les conventions de tests et le mode opératoire sont décrits dans [Contribution](./11-contribution.md).

## Récapitulatif

**Conventions confirmées (avec chemins) :**

- Point d'entrée → préfixe `/api/v2`, helmet, CORS, Swagger, validation globale : `backend/src/main.ts:12-44`.
- Middleware d'auth (JWT OIDC / clé d'API) appliqué à toutes les routes sauf liste d'exclusions : `backend/src/app.module.ts:79-84`, `backend/src/middlewares/auth.middleware.ts:40-76`.
- Module simple (`actor`) vs module riche (`applications` : repository + query builder + use-cases) : `backend/src/actor/`, `backend/src/applications/application.module.ts:17-41`.
- Imports absolus `src/...` inter-module, relatifs en intra-module, pas d'alias `@/` : `backend/src/actor/actor.service.ts:7-15`.
- `BaseService` **instancié** avec un delegate Prisma, audit Metadata + recalcul IQ via `ServiceOptions` : `backend/src/common/base.service.ts:9-161`, instanciation `backend/src/actor/actor.service.ts:37-41`, IQ `backend/src/common/utils/quality.utils.ts:3-69`.
- `PrismaService` `@Global()`, extensions `paginate` (`{results,total}`) et `decimalToNumber` : `backend/src/prisma/prisma.module.ts:6-12`, `backend/src/prisma/extensions/pagination.extension.ts:16-42`, `backend/src/prisma/extensions/decimal-to-number.extension.ts:14-24`.
- Migrations via `db:dev` (jamais `db push`) : `backend/package.json:12-26`.
- DTO `class-validator` + `@ApiProperty`, `PartialType`/`OmitType`, validation stricte (`whitelist` + `forbidNonWhitelisted`) : `backend/src/applications/dto/create-application.dto.ts`, `backend/src/config/app-config.ts:8-19`.
- Permissions par handler `@UseGuards(PermissionGuard)` + `@RequiredPermissions`, param `applicationId` : `backend/src/actor/actor.controller.ts:54-67`, `backend/src/common/guards/permission.guard.ts:15-30`.

**Écart relevé :**

- CLI `user create` : option déclarée `-a/--admin-level` (→ `options.adminLevel`) mais l'action lit `options.role`, ce qui rend la commande inopérante en l'état. À corriger en alignant le nom d'option et la lecture (`backend/src/cmd/user/create.ts:18-28`).
