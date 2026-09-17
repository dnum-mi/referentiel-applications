# vue-dsfr-project

Ce gabarit possède tous les outils configurés pour développer un projets Vue 3 et VueDsfr avec Vite.

## Recherches asynchrones et relations

`useAsyncSearch(search, { minLength, errorMessage })` centralise les résultats, le chargement et l'erreur d'un champ. Le seuil vaut trois caractères par défaut ; `AccessibleAutocomplete` conserve son seuil d'un caractère. Seule la dernière requête peut modifier l'état, y compris lorsqu'une ancienne requête échoue.

Les champs gardent leur délai VueUse de 300 ms. Ils appellent `reset()` dès chaque saisie, avant ce délai, afin qu'une ancienne réponse ne réapparaisse pas entre deux frappes. L'effacement, la sélection et le démontage invalident aussi les recherches en cours. Une instance du composable est nécessaire par champ indépendant. `reset(initialResults)` permet de conserver une sélection déjà résolue, comme une donnée affichée sous la forme « nom (famille) ».

`RelationModal` prend `mode="add"` ou `mode="edit"`, `applicationId` et, en édition, `relation`. Elle émet `addRelation` ou `updateRelation` et `close`. Depuis la fiche cible d'une relation entrante, la source reste en lecture seule. Les recherches de relations partagent `NEUTRAL_RELATION_FILTERS`, qui couvre aussi la corrélation et la médiation.

## Configuration recommandée

- Visual Studio Code avec ces extensions:
  - [VSCode](https://code.visualstudio.com/)
  - [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)
  - [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Vue Ecosystem Snippets](https://marketplace.visualstudio.com/items?itemName=matijao.vue-nuxt-snippets)

## Support de TypeScript pour les fichiers `.vue`

TypeScript ne sait pas gérer les informations de type pour les imports dans les fichiers `.vue` par défault, donc la CLI `tsc` est remplacée par `vue-tsc` pour la vérification des types. Dans les éditeurs, il est besoin de l’extension [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) pour rendre le service du langage TypeScript capable de gérer les types des fichiers `.vue`.

Si le plugin TypeScript ne vous semble pas assez performant, Volar a aussi implémenté un [mode Take Over](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) qui est plus performant. Vous pouvez l’activer en suivant les étapes suivantes:

1. Désactiver l’extension TypeScript incluse
   1. Lancer `Extensions: Show Built-in Extensions` depuis la palette de commandes VSCode
   2. Trouver `TypeScript and JavaScript Language Features`, cliquer avec le bouton droit et sélectionner `Disable (Workspace)`
2. Recharger la fenêtre VSCode en lançant `Developer: Reload Window` depuis la palette de commandes.

## Installer les dépendances

```sh
npm install
```

### Compilation et Hot-Reload pour le développement

```sh
npm run dev
```

### Vérification des types, Compilation et Minification pour la Production

```sh
npm run build
```

## Voir l'application avec le code de production

```sh
npm run preview
```

## Déployer le code de production

Déployer le contenu du dossier `dist` après avoir généré le code de production.

### Vérifier la syntaxe et le formattage avec [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Lancer les Tests Unitaires avec [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lancer les Tests End-to-End Tests avec [Playwright](https://playwright.dev/)

```sh
npm run test:e2e:dev
```

### Analyse statique du code avec [ESLint](https://eslint.org/)

```sh
npm run lint
```
