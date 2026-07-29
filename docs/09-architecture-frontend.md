# Architecture frontend (Vue 3)

Le frontend du Référentiel des Applications est une application monopage (SPA)
construite avec **Vue 3** (`<script setup>`), **Vite**, **Pinia**, **Vue Router**
et le **Système de Design de l'État** via [`@gouvminint/vue-dsfr`](https://vue-ds.fr/).
**PrimeVue** complète le DSFR pour les tableaux de données. Les appels réseau
passent par un **client API généré** depuis l'OpenAPI du backend
(voir [API du référentiel](./05-api.md)).

Ce document décrit l'organisation du code `frontend/src/`, les conventions de
développement vérifiées dans le dépôt et les briques techniques structurantes
(client API, stores, routage, authentification, design system, composables).

## Sommaire

- [1. Vue d'ensemble](#1-vue-densemble)
- [2. Conventions des composants](#2-conventions-des-composants)
- [3. Client API généré](#3-client-api-généré)
- [4. Stores Pinia](#4-stores-pinia)
- [5. Routage](#5-routage)
- [6. Authentification OIDC](#6-authentification-oidc)
- [7. Système de design](#7-système-de-design)
- [8. Composables](#8-composables)
- [9. Retours utilisateur et tests](#9-retours-utilisateur-et-tests)
- [10. Mise à jour de l'application (service worker)](#10-mise-à-jour-de-lapplication-service-worker)
- [11. Récapitulatif](#11-récapitulatif)

## 1. Vue d'ensemble

Le point d'entrée est `frontend/src/main.ts` : il crée l'application, enregistre
les plugins (Pinia, Vue Router, PrimeVue avec le thème Aura, Matomo), importe les
feuilles de style du DSFR, enregistre le composant global `VIcon` et la directive
`v-use-mermaid`, puis monte l'application sur `#app`
(`frontend/src/main.ts:22-52`).

```ts
// frontend/src/main.ts (extrait)
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(PrimeVue, { theme: { preset: Aura } });
app.component("VIcon", VIcon);
app.directive("use-mermaid", vUseMermaid);
app.mount("#app");
```

Le composant racine `frontend/src/App.vue` assemble la coque applicative DSFR
(`DsfrHeader`, `DsfrNavigation`, `DsfrFooter`, `DsfrSkipLinks`), affiche le
`RouterView`, branche le toaster global (`AppToaster`) et l'invite de
rechargement du service worker (`ReloadPrompt`). Il déclenche au montage la
configuration du client HTTP (`configureClients(toaster)`) et la récupération de
la configuration applicative (`getConfig()`), et adapte la navigation et les
liens rapides selon l'état d'authentification et les permissions
(`frontend/src/App.vue:22-109`).

Organisation des dossiers sous `frontend/src/` :

| Dossier        | Rôle                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `views/`       | Pages routées (lazy-loadées par le routeur).                                 |
| `components/`  | Composants réutilisables, auto-importés (voir §2).                           |
| `stores/`      | Stores Pinia en _setup syntax_ (voir §4).                                    |
| `router/`      | `index.ts` (routes + guards) et `route-names.ts` (objet `routeNames`).       |
| `api/`         | Façade du client (`index.ts`) et configuration HTTP (`init-clients.ts`).     |
| `client/`      | **Code généré** depuis l'OpenAPI — ne pas éditer (voir §3).                  |
| `composables/` | Logique réutilisable (`use-*`) (voir §8).                                    |
| `services/`    | Services transverses : `authentication.ts`, `config.ts`, `technicalDebt.ts`. |
| `models/`      | Modèles métier front (`Application.ts`, `relations.ts`, `user.ts`).          |
| `types/`       | Types front (`columns.ts`, `table.ts`, `relation-type-filter.ts`).           |
| `chart/`       | Constructeurs de graphes (`time-chart.builder.ts`).                          |
| `constants/`   | Constantes et dictionnaires (`dictionary.ts`, `breakpoint.ts`…).             |
| `utils/`       | Utilitaires (`chart.ts`, `log-dsfr-version.ts`…).                            |

## 2. Conventions des composants

- **`<script setup lang="ts">` systématique.** Tous les composants et vues
  utilisent la _Composition API_ en _setup syntax_ TypeScript
  (ex. `frontend/src/App.vue:1`, `frontend/src/components/RefAppTable.vue:1`).
- **Auto-import des composants.** La configuration Vite
  (`frontend/vite.config.ts:72-80`) déclare
  `unplugin-vue-components` avec `dirs: ["src/components"]` et le resolver
  `vueDsfrComponentResolver`. Les composants de `src/components/` **et** les
  composants `Dsfr*` (ex. `DsfrHeader`, `DsfrBadge`, `DsfrNavigation`) sont donc
  disponibles dans les templates **sans import explicite**. Les déclarations sont
  générées dans `frontend/src/components.d.ts`.
- **Auto-import des API.** `unplugin-auto-import`
  (`frontend/vite.config.ts:55-71`) expose sans import les API de `vue`,
  `vue-router`, `pinia`, `vitest` ainsi que le preset DSFR
  (`vueDsfrAutoimportPreset`). C'est ce qui permet d'utiliser `ref`, `computed`,
  `defineStore`, etc. sans ligne d'import (déclarations dans
  `frontend/src/auto-imports.d.ts`).
- **Alias `@`.** `@` pointe vers `frontend/src` (`frontend/vite.config.ts:84-85`).
- **`data-testid` systématique.** Les éléments interactifs et conteneurs portent
  un attribut `data-testid` pour cibler les tests (ex.
  `data-testid="main-header"`, `data-testid="main-navigation"`,
  `data-testid="app-toaster"` dans `frontend/src/App.vue:192-224`). `RefAppTable`
  expose une prop `dataTestId` à cet effet
  (`frontend/src/components/RefAppTable.vue:20`).

## 3. Client API généré

Le client API est **généré** par [`@hey-api/openapi-ts`](https://heyapi.dev/)
dans `frontend/src/client/`. La configuration `frontend/openapi-ts.config.ts`
prend en entrée `frontend/openapi/swagger.yaml` (alimenté par le Swagger du
backend, voir [API du référentiel](./05-api.md)) et produit `sdk.gen.ts`,
`types.gen.ts`, `schemas.gen.ts`, `transformers.gen.ts` et `client.gen.ts`.

> **Ne jamais éditer `src/client/**` à la main.\*\* Tout changement doit passer par
> la régénération.

La régénération s'effectue avec `pnpm gen` (alias de `npm run api:generate` →
`openapi-ts`, `frontend/package.json`). Mettre à jour
`frontend/openapi/swagger.yaml` depuis le backend avant régénération.

**Façade d'accès.** Le SDK n'est jamais importé directement : on passe par la
façade `frontend/src/api/index.ts`, qui réexporte le SDK généré.

```ts
// frontend/src/api/index.ts
import * as api from "@/client/sdk.gen";
export default api;
```

```ts
import api from "@/api/index";
```

**Configuration HTTP.** `frontend/src/api/init-clients.ts` configure le client
(base `/api/v2`, en-têtes, sérialisation des tableaux en CSV via `querySerializer`)
et installe les intercepteurs : injection du jeton d'accès OIDC en `Authorization:
Bearer …` sur chaque requête, et gestion centralisée des réponses 401
(relance du login), 403 (toast « Permission refusée ») et 404 (redirection vers
`NOTFOUND`). `configureClients(toaster)` est appelée au montage dans `App.vue`.

**Convention de lecture des réponses.** Vérifier systématiquement
`response.response.ok` **et** `response.data` avant d'exploiter le résultat.
Exemple réel dans `frontend/src/stores/applicationStore.ts:29-36` :

```ts
const response = await api.applicationControllerFindOne({
  path: { applicationId },
});
if (!response.data || !response.response.ok) {
  throw new Error("Erreur lors de la récupération de l'application.");
}
```

Les paramètres se passent par objet structuré (`path`, `body`, `query`), ex.
`api.applicationControllerUpdate({ path: { applicationId }, body: payload })`
(`frontend/src/stores/applicationStore.ts:55-58`).

## 4. Stores Pinia

Les stores utilisent la **setup syntax** : `defineStore("xxxStore", () => { … })`,
exposant `ref`/`computed` et fonctions, puis renvoyant l'objet public
(ex. `frontend/src/stores/applicationStore.ts:10`,
`frontend/src/stores/userStore.ts:8`).

Stores présents dans `frontend/src/stores/` :

| Store                  | `defineStore(...)`    | Rôle principal                                                                          |
| ---------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `applicationStore.ts`  | `"applicationStore"`  | Cycle de vie des applications (lecture, mise à jour, suppression, export, permissions). |
| `userStore.ts`         | `"userStore"`         | Utilisateur courant, authentification, permissions, abonnements.                        |
| `hostingStore.ts`      | `"hostingStore"`      | Hébergements.                                                                           |
| `organizationStore.ts` | `"organizationStore"` | Organisations / divisions métier.                                                       |
| `actorTypeStore.ts`    | `"actorTypeStore"`    | Types d'acteurs.                                                                        |
| `relationStore.ts`     | `"relationStore"`     | Relations entre applications.                                                           |
| `metadataStore.ts`     | `"metadataStore"`     | Historique des modifications (métadonnées).                                             |
| `reportStore.ts`       | `"reportStore"`       | Signalements.                                                                           |
| `statisticsStore.ts`   | `"statisticsStore"`   | Statistiques / indices de qualité.                                                      |
| `toasterStore.ts`      | `"toaster"`           | Messages de notification (voir §9).                                                     |

**Permissions côté front.** La vérification se fait via
`userStore.hasPermissions([...])`, qui agrège les permissions de l'utilisateur,
ses permissions additionnelles et d'éventuelles permissions applicatives
(`frontend/src/stores/userStore.ts:79-87`). Exemples : affichage du lien Admin et
garde de route admin via `Permission.ADMIN_PANEL_MANAGE`
(`frontend/src/App.vue:60`, `frontend/src/router/index.ts:158`). Détails du
modèle de permissions : [Permissions et sécurité](./06-permissions-et-securite.md).

## 5. Routage

Le routeur (`frontend/src/router/index.ts`) utilise `createWebHistory` et déclare
des routes dont les vues sont **lazy-loadées** (`component: () => import("@/views/…")`).

- **Noms de routes centralisés.** Les noms proviennent de l'objet `routeNames`
  (`frontend/src/router/route-names.ts`), jamais de chaînes en dur. On référence
  toujours `{ name: routeNames.SEARCHAPP }` (ex. `frontend/src/App.vue:96`,
  `frontend/src/stores/applicationStore.ts:85`).
- **Métadonnées (`meta`).** Chaque route porte `requiresAuth`, parfois
  `requiresAdmin`, et `title` (ex. `frontend/src/router/index.ts:91`).
- **Guard d'authentification (`beforeEach`).** Si `to.meta.requiresAuth`, le guard
  récupère l'utilisateur OIDC ; à défaut il mémorise la destination dans
  `sessionStorage` (`redirectAfterLogin`) et redirige vers `SIGNIN`. Il charge le
  profil (`userStore.fetchUser()`) si nécessaire, et pour `requiresAdmin` vérifie
  `ADMIN_PANEL_MANAGE` sinon redirige vers `/`
  (`frontend/src/router/index.ts:142-163`).
- **Guard de titre (`afterEach`).** Le titre du document est mis à jour depuis
  `to.meta.title` (`frontend/src/router/index.ts:166-170`).
- **Routes OIDC.** Le groupe `/oidc` (`callback`, `login`, `logout`) délègue à
  `USER_MANAGER` via `beforeEnter` (`frontend/src/router/index.ts:7-32`).

## 6. Authentification OIDC

L'authentification repose sur **OpenID Connect** via la bibliothèque
[`oidc-client-ts`](https://github.com/authts/oidc-client-ts)
(`frontend/src/services/authentication.ts`).

La configuration OIDC est **récupérée du backend** au démarrage via
`getConfig()` : l'`authority` est dérivée de `oidcConfigUrl` (en retirant le
suffixe `/.well-known/openid-configuration`) et le `client_id` de `oidcClientId`.
Le `USER_MANAGER` est instancié avec les URI de redirection (`/oidc/callback`),
le `response_type: "code"` (Authorization Code Flow) et les scopes
`openid profile email` (`frontend/src/services/authentication.ts:6-24`).

L'état d'authentification est maintenu dans `userStore` qui écoute les
**événements OIDC** : `addUserLoaded` (passe `authenticated` à `true` et appelle
`fetchUser()`) et `addUserUnloaded` (réinitialise l'utilisateur). L'état est aussi
initialisé au démarrage via `USER_MANAGER.getUser()`
(`frontend/src/stores/userStore.ts:13-28`). Le jeton d'accès est ensuite injecté
automatiquement dans chaque requête par l'intercepteur HTTP (voir §3).

## 7. Système de design

- **DSFR majoritaire (≈ 95 %).** L'interface s'appuie sur `@gouvminint/vue-dsfr`
  (composants `Dsfr*` auto-importés) et les feuilles de style `@gouvfr/dsfr`
  importées dans `main.ts`. La bascule clair/sombre utilise `useScheme()` du DSFR
  (`frontend/src/App.vue:165-169`). Voir [Système de design](./07-fonctionnalites.md)
  pour l'usage fonctionnel.
- **PrimeVue pour les tableaux.** Le composant `RefAppTable.vue` encapsule le
  `DataTable` de PrimeVue (`frontend/src/components/RefAppTable.vue:3-7`), avec
  pagination, tri et mode `lazy`. PrimeVue est enregistré avec le thème **Aura**
  (`frontend/src/main.ts:43-47`).
- **Graphes et visualisations.**
  - **d3** : graphes de relations (`frontend/src/composables/use-d3-graph.ts`).
  - **mermaid** : diagrammes via la directive `v-use-mermaid`
    (`frontend/src/composables/use-mermaid.ts`, enregistrée dans `main.ts`).
  - **chart.js** : graphiques statistiques (`frontend/src/utils/chart.ts`,
    composants `frontend/src/components/stats/*.vue`).

## 8. Composables

Les composables (`frontend/src/composables/`, préfixe `use-`) factorisent la
logique réutilisable :

| Composable                    | Rôle                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `use-application-search.ts`   | Recherche/filtrage d'applications, synchronisation avec la query de l'URL. |
| `use-d3-graph.ts`             | Construction et rendu des graphes de relations avec d3.                    |
| `use-mermaid.ts`              | Directive `v-use-mermaid` pour le rendu des diagrammes mermaid.            |
| `use-graph-style.ts`          | Styles partagés des graphes (couleurs par statut…).                        |
| `use-completeness.ts`         | Calcul du score de complétude d'une application.                           |
| `use-technical-debt-chart.ts` | Données et options du graphe de dette technique.                           |
| `use-column-preferences.ts`   | Préférences de colonnes des tableaux.                                      |
| `use-filter-watcher.ts`       | Surveillance et réinitialisation des filtres.                              |
| `use-relation-manager.ts`     | Gestion des relations entre applications.                                  |
| `use-accordion-manager.ts`    | Gestion de l'état des accordéons.                                          |
| `use-modal.ts`                | Ouverture/fermeture des modales.                                           |
| `use-date.ts`                 | Formatage des dates.                                                       |
| `use-sanitize-utils.ts`       | Nettoyage/échappement des libellés (notamment pour les graphes).           |

## 9. Retours utilisateur et tests

**Retours utilisateur.** Les notifications passent par le store
`useToasterStore()` (`frontend/src/stores/toasterStore.ts`), qui expose
`addSuccessMessage`, `addErrorMessage` et `addMessage` (avec délai d'expiration
par défaut de 15 s). Le rendu est assuré par `AppToaster` branché dans `App.vue`
(`frontend/src/App.vue:224`). Les intercepteurs HTTP s'en servent pour signaler
les erreurs 403 (§3).

**Tests.** Scripts définis dans `frontend/package.json` :

- **Tests unitaires** : `pnpm test:unit` → **Vitest** (`vitest run`).
- **Tests de bout en bout et accessibilité** : `pnpm test:e2e` → **Playwright**
  (avec **axe-core** pour l'a11y). Les sélecteurs s'appuient sur les
  `data-testid` (§2).
- **Vérification de types** : `pnpm type-check` → `vue-tsc`.

Détails des conventions de tests et de contribution :
[Contribution](./11-contribution.md).

## 10. Mise à jour de l'application (service worker)

Après un déploiement, les utilisateurs doivent disposer de la nouvelle version
sans hard refresh (#2149). Trois mécanismes complémentaires :

**Détection de version (`vite-plugin-pwa`, mode `prompt`).** Le service worker
est configuré en `registerType: "prompt"` (`frontend/vite.config.ts`) : quand
une nouvelle version est détectée, elle est téléchargée puis mise en attente, et
le bandeau `ReloadPrompt` (`frontend/src/components/ReloadPrompt.vue`) propose
« Recharger ». Le composable `useAppUpdate()`
(`frontend/src/composables/use-app-update.ts`) force en plus une vérification
toutes les 5 minutes (`UPDATE_CHECK_INTERVAL_MS`) — indispensable pour les
onglets de SPA restant ouverts longtemps, car le navigateur ne vérifie le
service worker qu'au chargement de la page.

**Rechargement sur chunk obsolète.** Les vues sont lazy-loadées : après un
déploiement, les chunks hashés de l'ancienne version n'existent plus et les
imports dynamiques échouent. `frontend/src/utils/stale-chunk.ts` recharge alors
automatiquement la page (listener `vite:preloadError` dans `main.ts` +
`router.onError` dans `router/index.ts`), avec un garde-fou `sessionStorage`
de 10 s contre les boucles de rechargement.

**Cache HTTP (`frontend/nginx.conf`).** `index.html`, `sw.js` et
`manifest.webmanifest` sont servis en `Cache-Control: no-cache` (toujours
revalidés) ; les assets hashés `/assets/` en `max-age=31536000, immutable`.

## 11. Récapitulatif

**Conventions confirmées dans le dépôt :**

- `<script setup lang="ts">` partout ; auto-import des composants `src/components`
  et `Dsfr*` (`frontend/vite.config.ts:55-80`) ; `data-testid` systématique.
- Client API généré par `@hey-api/openapi-ts`, non éditable, régénéré par
  `pnpm gen` depuis `frontend/openapi/swagger.yaml` ; accès via
  `import api from "@/api/index"` ; vérification `response.response.ok && response.data`.
- Stores Pinia en _setup syntax_ `defineStore("xxxStore", () => …)` ; permissions
  front via `userStore.hasPermissions([...])`.
- Routage : objet `routeNames`, vues lazy-loadées, `meta`
  (`requiresAuth`/`requiresAdmin`/`title`), guards `beforeEach`/`afterEach`.
- Authentification OIDC via `oidc-client-ts`, configuration récupérée du backend,
  état synchronisé sur les événements `userLoaded`/`userUnloaded`.
- DSFR majoritaire + PrimeVue pour les tableaux (`RefAppTable`) ; d3 / mermaid /
  chart.js pour les visualisations.

**Chemins clés :**

- `frontend/src/main.ts`, `frontend/src/App.vue`, `frontend/vite.config.ts`
- `frontend/src/api/index.ts`, `frontend/src/api/init-clients.ts`,
  `frontend/src/client/`, `frontend/openapi-ts.config.ts`,
  `frontend/openapi/swagger.yaml`
- `frontend/src/stores/`, `frontend/src/router/index.ts`,
  `frontend/src/router/route-names.ts`
- `frontend/src/services/authentication.ts`, `frontend/src/services/config.ts`
- `frontend/src/composables/`, `frontend/src/components/RefAppTable.vue`

**Écarts / points d'attention relevés :**

- Le manifeste PWA dans `frontend/vite.config.ts:35-53` porte encore des valeurs
  génériques (`name: "Dummy app"`, `short_name: "Dummy"`) — vestige de
  _boilerplate_ à corriger.
- `frontend/src/api/init-clients.ts:27` contient un `console.log({ status })` et
  d'autres `console.log` dans les intercepteurs — traces de debug à retirer.
- `init-clients.ts:75-76` installe puis **éjecte immédiatement** le
  `responseInterceptor` (`use` suivi de `eject`) : la gestion centralisée des
  réponses 401/403/404 est donc de fait désactivée. À vérifier / corriger si la
  gestion d'erreurs centralisée est attendue.
- L'aide à la décision technique sous-jacente n'est pas documentée dans un
  [ADR](../doc/adr/README.md) dédié.
